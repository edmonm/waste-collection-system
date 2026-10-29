import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole, requireRole } from "../middleware/auth.js";
import { ServiceRequest } from "../models/ServiceRequest.js";
import { User } from "../models/User.js";
import { sendSms } from "../services/sms.js";

const router = Router();
const createSchema = z.object({
  kind: z.enum(["special_request", "missed_pickup"]),
  description: z.string().trim().min(1).max(1000)
});
const updateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("approved"), scheduledDate: z.iso.date() }),
  z.object({ status: z.literal("declined"), declineReason: z.string().trim().min(1).max(500) })
]);
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["pending", "approved", "declined", "reviewed"]).optional(),
  kind: z.enum(["special_request", "missed_pickup"]).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "oldest", "scheduled"]).default("newest")
}).refine(({ from, to }) => !from || !to || from <= to, {
  message: "The start date must be on or before the end date.",
  path: ["to"]
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.use(authenticate);

router.post("/", requireRole("user"), async (request, response, next) => {
  try {
    const input = createSchema.parse(request.body);
    const serviceRequest = await ServiceRequest.create({
      ...input,
      resident: request.user.id,
      residencyId: request.user.residencyId
    });
    const notification = await sendSms(
      request.user.phone,
      "GreenLoop has received your community collection request. Your team will review it soon."
    );
    return response.status(201).json({ request: serviceRequest, notification });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireAnyRole("admin", "superadmin", "user"), async (request, response, next) => {
  try {
    const query = listQuerySchema.parse(request.query);
    const filter = request.user.role === "superadmin"
      ? {}
      : request.user.role === "admin"
        ? { residencyId: request.user.residencyId }
        : { resident: request.user.id, residencyId: request.user.residencyId };
    if (query.status) filter.status = query.status;
    if (query.kind) filter.kind = query.kind;
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) {
        const endDate = new Date(`${query.to}T00:00:00.000Z`);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        filter.createdAt.$lt = endDate;
      }
    }
    if (query.search) {
      const prefix = new RegExp(`^${escapeRegex(query.search)}`, "i");
      const residentFilter = {
        $or: [{ name: prefix }, { phone: prefix }, { email: prefix }]
      };
      if (request.user.role === "admin") residentFilter.residencyId = request.user.residencyId;
      if (request.user.role === "user") residentFilter._id = request.user.id;
      const residents = await User.find(residentFilter).distinct("_id");
      filter.resident = { $in: residents };
    }
    const skip = (query.page - 1) * query.limit;
    const order = query.sort === "oldest" ? 1 : -1;
    const sort = query.sort === "scheduled"
      ? { scheduledDate: 1, _id: 1 }
      : { createdAt: order, _id: order };
    const [requests, total, pendingCount] = await Promise.all([
      ServiceRequest.find(filter)
        .populate("resident", "name phone email")
        .populate("reviewedBy", "name")
        .sort(sort)
        .skip(skip)
        .limit(query.limit)
        .lean(),
      ServiceRequest.countDocuments(filter),
      ServiceRequest.countDocuments({
        ...(request.user.role === "superadmin"
          ? {}
          : request.user.role === "admin"
            ? { residencyId: request.user.residencyId }
            : { resident: request.user.id, residencyId: request.user.residencyId }),
        status: "pending"
      })
    ]);
    return response.json({
      requests,
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      counts: { pending: pendingCount }
    });
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
      : { _id: request.params.id, residencyId: request.user.residencyId };
    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      { ...filter, status: "pending" },
      decision.status === "approved"
        ? { status: decision.status, scheduledDate: new Date(`${decision.scheduledDate}T00:00:00.000Z`), declineReason: "", reviewedAt: new Date(), reviewedBy: request.user.id }
        : { status: decision.status, scheduledDate: null, declineReason: decision.declineReason, reviewedAt: new Date(), reviewedBy: request.user.id },
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
        `GreenLoop approved your community collection request for ${decision.scheduledDate}.`
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

export default router;
