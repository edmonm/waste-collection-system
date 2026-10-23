import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../db.js";
import { User } from "../models/User.js";

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE } = process.env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_PHONE) {
  throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_PHONE in .env before creating an admin.");
}
if (ADMIN_PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
}
if (!/^\+[1-9]\d{7,14}$/.test(ADMIN_PHONE)) {
  throw new Error("ADMIN_PHONE must use international format, for example +15551234567.");
}

try {
  await connectDatabase();
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error(`An account already exists for ${email}.`);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    name: ADMIN_NAME,
    email,
    phone: ADMIN_PHONE,
    passwordHash,
    role: "admin"
  });
  console.log(`Admin account created for ${email}`);
} catch (error) {
  console.error("Unable to create admin account:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
