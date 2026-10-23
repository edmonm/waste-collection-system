import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Schedule } from "../models/Schedule.js";
import { User } from "../models/User.js";
import { broadcastSms } from "../services/sms.js";

const router = Router();
const scheduleSchema = z.object({
  area: z.string().trim().min(2).max(100),
  date: z.iso.datetime().or(z.iso.date()),
  wasteType: z.enum(["General waste", "Recycling", "Green waste", "Bulk collection"]),
  notes: z.string().trim().max(300).optional().default("")
});

router.use(authenticate);

router.get("/", async (_request, response, next) => {
  try {
    const schedules = await Schedule.find({ date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
      .sort({ date: 1 })
      .limit(100)
      .lean();
    return response.json({ schedules });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireRole("admin"), async (request, response, next) => {
  try {
    const input = scheduleSchema.parse(request.body);
    const schedule = await Schedule.create({ ...input, createdBy: request.user.id });
    const residents = await User.find({ role: "resident" }).select("phone").lean();
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
