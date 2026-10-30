import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole } from "../middleware/auth.js";
import { Schedule } from "../models/Schedule.js";
import { Subdivision } from "../models/Subdivision.js";
import { User } from "../models/User.js";
import { broadcastSms } from "../services/sms.js";
import { currentManilaDateKey, formatDateKey, formatTime24Hour, manilaDateTime } from "../utils/dateTime.js";

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
    const filter = {};
    if (request.user.role !== "superadmin") {
      if (!request.user.residencyId) {
        return response.status(403).json({ error: "Your account needs a residency assignment to view collection schedules." });
      }
      filter.residencyId = new mongoose.Types.ObjectId(String(request.user.residencyId));
    }
    if (request.query.month !== undefined) {
      if (!["admin", "superadmin"].includes(request.user.role)) {
        return response.status(403).json({ error: "Only administrators can view collection history." });
      }
      const month = String(request.query.month);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return response.status(400).json({ error: "Provide a valid history month in YYYY-MM format." });
      }
      const [year, monthNumber] = month.split("-").map(Number);
      filter.date = {
        $gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
        $lt: new Date(Date.UTC(year, monthNumber, 1))
      };
    } else {
      filter.date = { $gte: new Date(`${currentManilaDateKey()}T00:00:00.000Z`) };
    }
    const schedulesQuery = Schedule.find(filter)
      .sort({ date: 1 })
      .populate("residencyId", "name");
    if (request.query.month === undefined) schedulesQuery.limit(100);
    const schedules = await schedulesQuery.lean();
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
    if (request.user.role === "admin" && !request.user.subdivisionId) {
      return response.status(403).json({ error: "Your account needs a subdivision assignment before publishing collection notices." });
    }
    let area = input.area;
    if (request.user.role === "admin") {
      const subdivision = await Subdivision.findOne({
        _id: request.user.subdivisionId,
        residencyId
      }).select("name");
      if (!subdivision) {
        return response.status(403).json({ error: "Your assigned subdivision is unavailable for collection publishing." });
      }
      if (input.area !== subdivision.name) {
        return response.status(400).json({ error: "Choose your assigned subdivision as the collection area." });
      }
      area = subdivision.name;
    }
    const dateKey = new Date(input.date).toISOString().slice(0, 10);
    const schedule = await Schedule.create({
      ...input,
      area,
      date: new Date(`${dateKey}T00:00:00.000Z`),
      scheduledAt: manilaDateTime(dateKey, input.estimatedArrivalTime),
      scheduledSmsStatus: "pending",
      scheduledSmsClaimedAt: null,
      scheduledSmsNextAttemptAt: null,
      scheduledSmsSentAt: null,
      residencyId,
      subdivisionId: request.user.role === "admin" ? request.user.subdivisionId : null,
      createdBy: request.user.id
    });
    const recipientFilter = {
      role: { $in: ["user", "resident"] },
      residencyId
    };
    if (request.user.role === "admin") recipientFilter.subdivisionId = request.user.subdivisionId;
    const residents = await User.find(recipientFilter).select("phone").lean();
    const notification = await broadcastSms(
      residents.map((resident) => resident.phone),
      `GreenLoop collection update: ${schedule.wasteType} in ${schedule.area} on ${formatDateKey(new Date(schedule.date).toISOString().slice(0, 10))}. Estimated arrival time: ${formatTime24Hour(schedule.estimatedArrivalTime)} Philippines time.`
    );
    return response.status(201).json({ schedule, notification });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAnyRole("admin", "superadmin"), async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid schedule identifier." });
    }
    const filter = request.user.role === "superadmin"
      ? { _id: request.params.id }
      : { _id: request.params.id, residencyId: request.user.residencyId };
    const schedule = await Schedule.findOneAndDelete(filter);
    if (!schedule) return response.status(404).json({ error: "Schedule not found." });
    return response.json({ message: "Collection schedule deleted." });
  } catch (error) {
    return next(error);
  }
});

export default router;
