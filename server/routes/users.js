import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Residency } from "../models/Residency.js";
import { Subdivision } from "../models/Subdivision.js";
import { ServiceRequest } from "../models/ServiceRequest.js";
import { philippinesMobileMessage, philippinesMobilePattern, temporaryPassword } from "../constants.js";

const router = Router();
const phoneSchema = z.string().regex(philippinesMobilePattern, philippinesMobileMessage);
const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: phoneSchema,
  role: z.enum(["admin", "user"]),
  residencyId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  subdivisionId: z.string().regex(/^[a-f\d]{24}$/i).optional()
});
const updateSchema = z.object({
  residencyId: z.string().regex(/^[a-f\d]{24}$/i),
  subdivisionId: z.string().regex(/^[a-f\d]{24}$/i),
  role: z.enum(["admin", "user"])
});

router.use(authenticate, requireAnyRole("admin", "superadmin"));

router.get("/", async (request, response, next) => {
  try {
    if (request.user.role === "admin" && !request.user.subdivisionId) {
      return response.status(403).json({ error: "Your account needs a subdivision assignment to manage residents." });
    }
    const filter = request.user.role === "superadmin"
      ? { role: { $ne: "superadmin" } }
      : { residencyId: request.user.residencyId, subdivisionId: request.user.subdivisionId, role: { $in: ["user", "resident"] } };
    const users = await User.find(filter)
      .select("name email phone role residencyId subdivisionId createdAt")
      .populate(["residencyId", "subdivisionId"])
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
    const subdivisionId = request.user.role === "admin" ? request.user.subdivisionId : input.subdivisionId;
    if (!subdivisionId) return response.status(400).json({ error: "Assign this account to a subdivision." });
    const residency = await Residency.findOne({ _id: residencyId, active: true });
    if (!residency) return response.status(400).json({ error: "Choose an active residency." });
    const subdivision = await Subdivision.findOne({ _id: subdivisionId, residencyId: residency._id });
    if (!subdivision) return response.status(400).json({ error: "Choose a subdivision in the selected residency." });
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role,
      mustChangePassword: true,
      residencyId: residency._id,
      subdivisionId: subdivision._id
    });
    await user.populate(["residencyId", "subdivisionId"]);
    return response.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        residencyId: residency.id,
        residencyName: residency.name,
        subdivisionId: subdivision.id,
        subdivisionName: subdivision.name
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
    const subdivision = await Subdivision.findOne({ _id: input.subdivisionId, residencyId: residency._id });
    if (!subdivision) return response.status(400).json({ error: "Choose a subdivision in the selected residency." });
    const user = await User.findById(request.params.id);
    if (!user || user.role === "superadmin") return response.status(404).json({ error: "Account not found." });
    user.residencyId = residency._id;
    user.subdivisionId = subdivision._id;
    if (input.role !== user.role) user.role = input.role;
    await user.save();
    await user.populate(["residencyId", "subdivisionId"]);
    return response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        residencyId: residency.id,
        residencyName: residency.name,
        subdivisionId: subdivision.id,
        subdivisionName: subdivision.name
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  try {
    if (request.user.role === "admin" && !request.user.subdivisionId) {
      return response.status(403).json({ error: "Your account needs a subdivision assignment to manage residents." });
    }
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid account identifier." });
    }
    const filter = request.user.role === "superadmin"
      ? { _id: request.params.id, role: { $in: ["user", "resident"] } }
      : { _id: request.params.id, role: { $in: ["user", "resident"] }, residencyId: request.user.residencyId, subdivisionId: request.user.subdivisionId };
    const user = await User.findOneAndDelete(filter);
    if (!user) return response.status(404).json({ error: "Resident account not found." });
    await ServiceRequest.deleteMany({ resident: user._id });
    return response.json({ message: "Resident account and its service requests deleted." });
  } catch (error) {
    return next(error);
  }
});

export default router;
