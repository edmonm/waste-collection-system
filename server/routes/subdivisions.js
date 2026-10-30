import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole, requireRole } from "../middleware/auth.js";
import { Residency } from "../models/Residency.js";
import { Subdivision } from "../models/Subdivision.js";

const router = Router();
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  residencyId: z.string().regex(/^[a-f\d]{24}$/i)
});

router.use(authenticate, requireAnyRole("admin", "superadmin"));

router.get("/", async (request, response, next) => {
  try {
    let residencyId;
    if (request.user.role === "admin") {
      residencyId = request.user.residencyId;
    } else if (request.query.residencyId !== undefined) {
      if (!mongoose.isValidObjectId(String(request.query.residencyId))) {
        return response.status(400).json({ error: "Invalid residency identifier." });
      }
      residencyId = request.query.residencyId;
    }
    const filter = residencyId ? { residencyId } : {};
    const subdivisions = await Subdivision.find(filter)
      .sort({ name: 1 })
      .populate("residencyId", "name")
      .lean();
    return response.json({ subdivisions });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireRole("superadmin"), async (request, response, next) => {
  try {
    const input = createSchema.parse(request.body);
    const residency = await Residency.findOne({ _id: input.residencyId, active: true });
    if (!residency) return response.status(400).json({ error: "Choose an active residency." });
    const nameKey = input.name.toLocaleLowerCase("en");
    const subdivision = await Subdivision.create({
      name: input.name,
      nameKey,
      residencyId: residency._id
    });
    await subdivision.populate("residencyId", "name");
    return response.status(201).json({ subdivision });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: "That subdivision already exists in this residency." });
    return next(error);
  }
});

export default router;
