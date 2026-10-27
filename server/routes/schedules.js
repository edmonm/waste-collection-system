import { Router } from "express";
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

router.use(authenticate);

router.get("/", async (request, response, next) => {
  try {
    const filter = { date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } };
    if (request.user.role !== "superadmin") filter.residencyId = request.user.residencyId;
    const schedules = await Schedule.find(filter)
      .sort({ date: 1 })
      .limit(100)
      .populate("residencyId", "name")
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
    const schedule = await Schedule.create({ ...input, residencyId, createdBy: request.user.id });
    const residents = await User.find({ role: { $in: ["user", "resident"] }, residencyId }).select("phone").lean();
    const notification = await broadcastSms(
      residents.map((resident) => resident.phone),
      `GreenLoop collection update: ${schedule.wasteType} in ${schedule.area} on ${new Date(schedule.date).toLocaleDateString()}.`
    );
    return response.status(201).json({ schedule, notification });
  } catch (error) {
    return next(error);
  }
});

export default router;
