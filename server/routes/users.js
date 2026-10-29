import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireAnyRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Residency } from "../models/Residency.js";
import { philippinesMobileMessage, philippinesMobilePattern, temporaryPassword } from "../constants.js";

const router = Router();
const phoneSchema = z.string().regex(philippinesMobilePattern, philippinesMobileMessage);
const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: phoneSchema,
  role: z.enum(["admin", "user"]),
  residencyId: z.string().regex(/^[a-f\d]{24}$/i).optional()
});
const updateSchema = z.object({
  residencyId: z.string().regex(/^[a-f\d]{24}$/i),
  role: z.enum(["admin", "user"]).optional()
});
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(80).optional(),
  residencyId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  role: z.enum(["admin", "user"]).optional()
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.use(authenticate, requireAnyRole("admin", "superadmin"));

router.get("/", async (request, response, next) => {
  try {
    const query = listQuerySchema.parse(request.query);
    const baseFilter = request.user.role === "superadmin"
      ? { role: { $ne: "superadmin" } }
      : { residencyId: request.user.residencyId, role: { $in: ["user", "resident"] } };
    if (request.user.role === "superadmin" && query.residencyId) {
      baseFilter.residencyId = query.residencyId;
    }
    const filter = { ...baseFilter };
    if (request.user.role === "superadmin" && query.role) {
      filter.role = query.role === "user" ? { $in: ["user", "resident"] } : query.role;
    }
    if (query.search) {
      const prefix = new RegExp(`^${escapeRegex(query.search)}`, "i");
      filter.$or = [{ name: prefix }, { email: prefix }, { phone: prefix }];
    }
    const skip = (query.page - 1) * query.limit;
    const [users, total, roleCounts] = await Promise.all([
      User.find(filter)
        .select("name email phone role residencyId createdAt")
        .populate("residencyId", "name")
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      User.countDocuments(filter),
      User.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ])
    ]);
    const counts = Object.fromEntries(roleCounts.map(({ _id, count }) => [_id, count]));
    return response.json({
      users,
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      counts: { admins: counts.admin || 0, residents: (counts.user || 0) + (counts.resident || 0) }
    });
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
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role,
      mustChangePassword: true,
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
    if (input.role && input.role !== user.role) {
      user.role = input.role;
      user.passwordHash = await bcrypt.hash(temporaryPassword, 12);
      user.mustChangePassword = true;
    }
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
