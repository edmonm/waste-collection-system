import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole } from "../middleware/auth.js";
import { Schedule } from "../models/Schedule.js";
import { User } from "../models/User.js";
import { broadcastSms } from "../services/sms.js";

const router = Router();
const scheduleSchema = z.object({
  area: z.string().trim().min(2).max(100),
  date: z.iso.datetime().or(z.iso.date()),
  estimatedArrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  wasteType: z.enum(["General waste", "Recycling", "Green waste", "Bulk collection"]),
  notes: z.string().trim().max(300).optional().default(""),
  residencyId: z.string().regex(/^[a-f\d]{24}$/i).optional()
});
const updateSchema = scheduleSchema.omit({ residencyId: true }).partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one schedule field to update." }
);
const cancelSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

function dateValue(value) {
  return new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
}

function scheduleValues(schedule) {
  return {
    area: schedule.area,
    date: schedule.date.toISOString(),
    estimatedArrivalTime: schedule.estimatedArrivalTime,
    wasteType: schedule.wasteType,
    notes: schedule.notes || ""
  };
}

function scheduleDateLabel(date) {
  return date.toLocaleDateString("en-PH", { dateStyle: "long", timeZone: "UTC" });
}

function scheduleMessage(schedule, prefix) {
  return `${prefix}: ${schedule.wasteType} in ${schedule.area} on ${scheduleDateLabel(schedule.date)}${schedule.estimatedArrivalTime ? `, estimated arrival ${schedule.estimatedArrivalTime}` : ""}.`;
}

async function notifyResidency(residencyId, message) {
  try {
    const residents = await User.find({ role: { $in: ["user", "resident"] }, residencyId }).select("phone").lean();
    return await broadcastSms(residents.map((resident) => resident.phone), message);
  } catch (error) {
    console.error("Schedule was saved, but resident notification could not be prepared:", error.message);
    return { sent: false, delivered: 0, reason: "Schedule was saved, but resident notification could not be prepared." };
  }
}

function scheduleScope(request) {
  return request.user.role === "superadmin" ? {} : { residencyId: request.user.residencyId };
}

router.use(authenticate);

router.get("/", async (request, response, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const includeHistory = request.query.includeHistory === "true" && ["admin", "superadmin"].includes(request.user.role);
    const filter = includeHistory
      ? {
        ...scheduleScope(request),
        $or: [
          { status: { $ne: "cancelled" }, date: { $gte: today } },
          { status: "cancelled" }
        ]
      }
      : { ...scheduleScope(request), status: { $ne: "cancelled" }, date: { $gte: today } };
    const schedules = await Schedule.find(filter)
      .sort({ status: -1, date: 1, _id: 1 })
      .limit(500)
      .populate("residencyId", "name")
      .populate("history.changedBy", "name")
      .populate("cancelledBy", "name")
      .lean();
    return response.json({ schedules });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAnyRole("admin", "superadmin"), async (request, response, next) => {
  try {
    const input = scheduleSchema.parse(request.body);
    const residencyId = request.user.role === "admin" ? request.user.residencyId : input.residencyId;
    if (!residencyId) return response.status(400).json({ error: "Select a residency for this schedule." });
    const schedule = await Schedule.create({
      ...input,
      date: dateValue(input.date),
      residencyId,
      createdBy: request.user.id
    });
    const notification = await notifyResidency(
      residencyId,
      scheduleMessage(schedule, "GreenLoop collection update")
    );
    return response.status(201).json({ schedule, notification });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", requireAnyRole("admin", "superadmin"), async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid schedule identifier." });
    }
    const input = updateSchema.parse(request.body);
    const schedule = await Schedule.findOne({ _id: request.params.id, ...scheduleScope(request) });
    if (!schedule) return response.status(404).json({ error: "Schedule not found." });
    if (schedule.status === "cancelled") return response.status(409).json({ error: "Cancelled schedules cannot be edited." });

    const before = scheduleValues(schedule);
    const normalizedInput = { ...input };
    if (input.date) normalizedInput.date = dateValue(input.date).toISOString();
    const changes = Object.entries(normalizedInput)
      .filter(([field, value]) => before[field] !== value)
      .map(([field, value]) => ({ field, from: before[field], to: value }));
    if (changes.length === 0) {
      return response.status(400).json({ error: "The updated schedule must differ from its current values." });
    }
    for (const [field, value] of Object.entries(input)) {
      schedule[field] = field === "date" ? dateValue(value) : value;
    }
    schedule.history.push({
      action: "updated",
      changedAt: new Date(),
      changedBy: request.user.id,
      changes
    });
    await schedule.save();

    const notification = await notifyResidency(
      schedule.residencyId,
      scheduleMessage(schedule, "GreenLoop collection schedule updated")
    );
    return response.json({ schedule, notification });
  } catch (error) {
    if (error instanceof mongoose.Error.VersionError) {
      return response.status(409).json({ error: "This schedule changed while you were editing it. Reload and try again." });
    }
    return next(error);
  }
});

router.patch("/:id/cancel", requireAnyRole("admin", "superadmin"), async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid schedule identifier." });
    }
    const { reason } = cancelSchema.parse(request.body);
    const schedule = await Schedule.findOne({ _id: request.params.id, ...scheduleScope(request) });
    if (!schedule) return response.status(404).json({ error: "Schedule not found." });
    if (schedule.status === "cancelled") return response.status(409).json({ error: "This schedule has already been cancelled." });

    const values = scheduleValues(schedule);
    schedule.status = "cancelled";
    schedule.cancelledAt = new Date();
    schedule.cancelledBy = request.user.id;
    schedule.cancellationReason = reason;
    schedule.history.push({
      action: "cancelled",
      changedAt: schedule.cancelledAt,
      changedBy: request.user.id,
      changes: [],
      reason
    });
    await schedule.save();

    const notification = await notifyResidency(
      schedule.residencyId,
      `GreenLoop collection cancelled: ${values.wasteType} in ${values.area} on ${scheduleDateLabel(new Date(values.date))}. Reason: ${reason}`
    );
    return response.json({ schedule, notification });
  } catch (error) {
    if (error instanceof mongoose.Error.VersionError) {
      return response.status(409).json({ error: "This schedule changed while you were cancelling it. Reload and try again." });
    }
    return next(error);
  }
});

export default router;
