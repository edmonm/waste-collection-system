import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole, requireRole } from "../middleware/auth.js";
import { ServiceRequest } from "../models/ServiceRequest.js";
import { sendSms } from "../services/sms.js";

const router = Router();
const createSchema = z.object({
  kind: z.enum(["special_request", "missed_pickup"]),
  description: z.string().trim().min(8).max(1000)
});
const updateSchema = z.object({ status: z.literal("reviewed") });

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

router.get("/", requireAnyRole("admin", "superadmin"), async (request, response, next) => {
  try {
    const filter = request.user.role === "superadmin" ? {} : { residencyId: request.user.residencyId };
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
    const { status } = updateSchema.parse(request.body);
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid request identifier." });
    }
    const filter = request.user.role === "superadmin"
      ? { _id: request.params.id }
      : { _id: request.params.id, residencyId: request.user.residencyId };
    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      filter,
      { status },
      { new: true, runValidators: true }
    ).populate("resident", "name phone email");
    if (!serviceRequest) return response.status(404).json({ error: "Request not found." });
    const notification = await sendSms(
      serviceRequest.resident.phone,
      "GreenLoop has reviewed your community collection request."
    );
    return response.json({ request: serviceRequest, notification });
  } catch (error) {
    return next(error);
  }
});

export default router;
