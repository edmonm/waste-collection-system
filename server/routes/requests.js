import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole, requireRole } from "../middleware/auth.js";
import { ServiceRequest } from "../models/ServiceRequest.js";
import { User } from "../models/User.js";
import { sendSms } from "../services/sms.js";
import { formatDateKey, formatTime24Hour, manilaDateTime } from "../utils/dateTime.js";

const router = Router();
const createSchema = z.object({
  kind: z.enum(["special_request", "missed_pickup"]),
  description: z.string().trim().min(1).max(1000)
});
const updateSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("approved"),
    scheduledDate: z.iso.date(),
    scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  }),
  z.object({ status: z.literal("declined"), declineReason: z.string().trim().min(1).max(500) })
]);

async function adminSubdivisionFilter(user) {
  if (!user.subdivisionId) return null;
  const residentIds = await User.find({
    residencyId: user.residencyId,
    subdivisionId: user.subdivisionId,
    role: { $in: ["user", "resident"] }
  }).distinct("_id");
  return {
    residencyId: user.residencyId,
    $or: [
      { subdivisionId: user.subdivisionId },
      { subdivisionId: null, resident: { $in: residentIds } }
    ]
  };
}

router.use(authenticate);

router.post("/", requireRole("user"), async (request, response, next) => {
  try {
    if (!request.user.subdivisionId) {
      return response.status(403).json({ error: "Your account needs a subdivision assignment before submitting requests." });
    }
    const input = createSchema.parse(request.body);
    const serviceRequest = await ServiceRequest.create({
      ...input,
      resident: request.user.id,
      residencyId: request.user.residencyId,
      subdivisionId: request.user.subdivisionId
    });
    return response.status(201).json({ request: serviceRequest });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireAnyRole("admin", "superadmin", "user"), async (request, response, next) => {
  try {
    const filter = request.user.role === "superadmin"
      ? {}
      : request.user.role === "admin"
        ? await adminSubdivisionFilter(request.user)
        : { resident: request.user.id, residencyId: request.user.residencyId };
    if (request.user.role === "admin" && !filter) {
      return response.status(403).json({ error: "Your account needs a subdivision assignment to manage requests." });
    }
    const requests = await ServiceRequest.find(filter)
      .populate("resident", "name phone email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return response.json({ requests });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", requireAnyRole("admin", "superadmin"), async (request, response, next) => {
  try {
    const decision = updateSchema.parse(request.body);
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid request identifier." });
    }
    const filter = request.user.role === "superadmin"
      ? { _id: request.params.id }
      : {
        ...await adminSubdivisionFilter(request.user),
        _id: request.params.id,
        residencyId: request.user.residencyId
      };
    if (request.user.role === "admin" && !request.user.subdivisionId) {
      return response.status(403).json({ error: "Your account needs a subdivision assignment to manage requests." });
    }
    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      { ...filter, status: "pending" },
      decision.status === "approved"
        ? {
          status: decision.status,
          scheduledDate: new Date(`${decision.scheduledDate}T00:00:00.000Z`),
          scheduledTime: decision.scheduledTime,
          scheduledAt: manilaDateTime(decision.scheduledDate, decision.scheduledTime),
          scheduledSmsStatus: "pending",
          scheduledSmsClaimedAt: null,
          scheduledSmsNextAttemptAt: null,
          scheduledSmsSentAt: null,
          subdivisionId: request.user.role === "admin" ? request.user.subdivisionId : undefined,
          declineReason: ""
        }
        : {
          status: decision.status,
          scheduledDate: null,
          scheduledTime: null,
          scheduledAt: null,
          scheduledSmsStatus: null,
          scheduledSmsClaimedAt: null,
          scheduledSmsNextAttemptAt: null,
          scheduledSmsSentAt: null,
          subdivisionId: request.user.role === "admin" ? request.user.subdivisionId : undefined,
          declineReason: decision.declineReason
        },
      { new: true, runValidators: true }
    ).populate("resident", "name phone email");
    if (!serviceRequest) {
      const existingRequest = await ServiceRequest.exists(filter);
      if (existingRequest) return response.status(409).json({ error: "This request has already been reviewed." });
      return response.status(404).json({ error: "Request not found." });
    }
    const notification = decision.status === "approved"
      ? await sendSms(
        serviceRequest.resident.phone,
        `GreenLoop approved your community collection. Estimated collection time: ${formatDateKey(decision.scheduledDate)} at ${formatTime24Hour(decision.scheduledTime)} Philippines time.`
      )
      : await sendSms(
        serviceRequest.resident.phone,
        `GreenLoop declined your community collection request. Reason: ${decision.declineReason}`
      );
    return response.json({ request: serviceRequest, notification });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAnyRole("admin", "superadmin", "user"), async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid request identifier." });
    }
    const filter = request.user.role === "superadmin"
      ? { _id: request.params.id }
      : request.user.role === "admin"
        ? { ...await adminSubdivisionFilter(request.user), _id: request.params.id, residencyId: request.user.residencyId }
        : { _id: request.params.id, resident: request.user.id, residencyId: request.user.residencyId };
    if (request.user.role === "admin" && !request.user.subdivisionId) {
      return response.status(403).json({ error: "Your account needs a subdivision assignment to manage requests." });
    }
    const serviceRequest = await ServiceRequest.findOneAndDelete(filter);
    if (!serviceRequest) return response.status(404).json({ error: "Service request not found." });
    return response.json({ message: "Service request deleted." });
  } catch (error) {
    return next(error);
  }
});

export default router;
