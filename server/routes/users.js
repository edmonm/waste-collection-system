import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Residency } from "../models/Residency.js";

const router = Router();
const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number in international format.");
const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: phoneSchema,
  password: z.string().min(8).max(72),
  role: z.enum(["admin", "user"]),
  residencyId: z.string().regex(/^[a-f\d]{24}$/i).optional()
});
const updateSchema = z.object({
  residencyId: z.string().regex(/^[a-f\d]{24}$/i),
  role: z.enum(["admin", "user"]).optional()
});

router.use(authenticate, requireAnyRole("admin", "superadmin"));

router.get("/", async (request, response, next) => {
  try {
    const filter = request.user.role === "superadmin"
      ? { role: { $ne: "superadmin" } }
      : { residencyId: request.user.residencyId, role: "user" };
    const users = await User.find(filter)
      .select("name email phone role residencyId createdAt")
      .populate("residencyId", "name")
      .sort({ name: 1 })
      .limit(500)
      .lean();
    return response.json({ users });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const input = createUserSchema.parse(request.body);
    const role = request.user.role === "admin" ? "user" : input.role;
    const residencyId = request.user.role === "admin" ? request.user.residencyId : input.residencyId;
    if (!residencyId) return response.status(400).json({ error: "Select a residency for this account." });
    const residency = await Residency.findOne({ _id: residencyId, active: true });
    if (!residency) return response.status(400).json({ error: "Choose an active residency." });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role,
      residencyId: residency._id
    });
    await user.populate("residencyId", "name");
    return response.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        residencyId: residency.id,
        residencyName: residency.name
      }
    });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: "An account with that email already exists." });
    return next(error);
  }
});

router.patch("/:id", async (request, response, next) => {
  try {
    if (request.user.role !== "superadmin") {
      return response.status(403).json({ error: "Only a superadmin can reassign accounts." });
    }
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid account identifier." });
    }
    const input = updateSchema.parse(request.body);
    const residency = await Residency.findOne({ _id: input.residencyId, active: true });
    if (!residency) return response.status(400).json({ error: "Choose an active residency." });
    const user = await User.findById(request.params.id);
    if (!user || user.role === "superadmin") return response.status(404).json({ error: "Account not found." });
    user.residencyId = residency._id;
    if (input.role) user.role = input.role;
    await user.save();
    await user.populate("residencyId", "name");
    return response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        residencyId: residency.id,
        residencyName: residency.name
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
