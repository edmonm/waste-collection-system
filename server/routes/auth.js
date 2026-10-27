import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { Residency } from "../models/Residency.js";
import { authenticate } from "../middleware/auth.js";
import { philippinesMobileMessage, philippinesMobilePattern } from "../constants.js";

const router = Router();
const phoneSchema = z.string().regex(philippinesMobilePattern, philippinesMobileMessage);
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
  loginAs: z.enum(["superadmin", "admin", "user"]).optional()
});
const changePasswordSchema = z.object({
  newPassword: z.string().min(8).max(72).refine((password) => password !== "11111111", "Choose a password other than the temporary password.")
});

function issueToken(user) {
  const role = user.role === "resident" ? "user" : user.role;
  return jwt.sign({ sub: user.id, role, purpose: "access" }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function issuePasswordChangeToken(user) {
  return jwt.sign({ sub: user.id, purpose: "password-change" }, config.jwtSecret, { expiresIn: "10m" });
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
      mustChangePassword: false,
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
    if (!user || (input.loginAs && actualRole !== input.loginAs) || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return response.status(401).json({ error: "Email or password is incorrect." });
    }
    if (actualRole !== "superadmin") {
      if (!user.residencyId) {
        return response.status(403).json({ error: "This account has no residency assigned. Ask a superadmin for help." });
      }
      const residency = await Residency.findOne({ _id: user.residencyId, active: true });
      if (!residency) return response.status(403).json({ error: "This account's residency is inactive. Contact a superadmin." });
    }
    await user.populate("residencyId", "name");
    if (user.mustChangePassword) {
      return response.json({
        passwordChangeRequired: true,
        passwordChangeToken: issuePasswordChangeToken(user),
        user: publicUser(user)
      });
    }
    return response.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/change-password", async (request, response, next) => {
  try {
    const [scheme, token] = (request.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) {
      return response.status(401).json({ error: "Your password change session is missing or expired. Please sign in again." });
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      return response.status(401).json({ error: "Your password change session has expired. Please sign in again." });
    }
    if (payload.purpose !== "password-change") {
      return response.status(403).json({ error: "A temporary-password session is required to change your password." });
    }

    const { newPassword } = changePasswordSchema.parse(request.body);
    const user = await User.findOneAndUpdate(
      { _id: payload.sub, mustChangePassword: true, role: { $in: ["admin", "user"] } },
      { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false },
      { new: true, runValidators: true }
    );
    if (!user) return response.status(403).json({ error: "This account no longer requires a password change. Sign in again." });
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
