import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number in international format.");
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: phoneSchema,
  password: z.string().min(8).max(72)
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
});

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

router.post("/register", async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({ ...input, email: input.email.toLowerCase(), passwordHash, role: "resident" });
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
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return response.status(401).json({ error: "Email or password is incorrect." });
    }
    return response.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

export default router;
