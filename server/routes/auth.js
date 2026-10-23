import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { Residency } from "../models/Residency.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number in international format.");
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: phoneSchema,
  password: z.string().min(8).max(72),
  residencyId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid residency.")
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
  loginAs: z.enum(["superadmin", "admin", "user"])
});

function issueToken(user) {
  const role = user.role === "resident" ? "user" : user.role;
  return jwt.sign({ sub: user.id, role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role === "resident" ? "user" : user.role,
    residencyId: user.residencyId?._id?.toString() || user.residencyId?.toString() || null,
    residencyName: user.residencyId?.name || null
  };
}

router.get("/residencies", async (_request, response, next) => {
  try {
    const residencies = await Residency.find({ active: true }).select("name").sort({ name: 1 }).lean();
    return response.json({ residencies });
  } catch (error) {
    return next(error);
  }
});

router.post("/register", async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    const residency = await Residency.findOne({ _id: input.residencyId, active: true });
    if (!residency) return response.status(400).json({ error: "Choose an active residency." });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({
      ...input,
      email: input.email.toLowerCase(),
      passwordHash,
      role: "user",
      residencyId: residency._id
    });
    return response.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: "An account with that email already exists." });
    return next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
    const actualRole = user?.role === "resident" ? "user" : user?.role;
    if (!user || actualRole !== input.loginAs || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return response.status(401).json({ error: "Email or password is incorrect for this sign-in type." });
    }
    if (actualRole !== "superadmin") {
      if (!user.residencyId) {
        return response.status(403).json({ error: "This account has no residency assigned. Ask a superadmin for help." });
      }
      const residency = await Residency.findOne({ _id: user.residencyId, active: true });
      if (!residency) return response.status(403).json({ error: "This account's residency is inactive. Contact a superadmin." });
    }
    await user.populate("residencyId", "name");
    return response.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, async (request, response, next) => {
  try {
    await request.user.populate("residencyId", "name");
    return response.json({ user: publicUser(request.user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
