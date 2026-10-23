import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../db.js";
import { User } from "../models/User.js";
import { Residency } from "../models/Residency.js";

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE, ADMIN_RESIDENCY_ID } = process.env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_PHONE || !ADMIN_RESIDENCY_ID) {
  throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE, and ADMIN_RESIDENCY_ID in .env before creating an admin.");
}
if (ADMIN_PASSWORD.length < 8) {
  throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
}
if (!/^\+[1-9]\d{7,14}$/.test(ADMIN_PHONE)) {
  throw new Error("ADMIN_PHONE must use international format, for example +15551234567.");
}
if (!/^[a-f\d]{24}$/i.test(ADMIN_RESIDENCY_ID)) {
  throw new Error("ADMIN_RESIDENCY_ID must be a valid residency ID created by a superadmin.");
}

try {
  await connectDatabase();
  const residency = await Residency.findOne({ _id: ADMIN_RESIDENCY_ID, active: true });
  if (!residency) throw new Error("ADMIN_RESIDENCY_ID does not match an active residency.");
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error(`An account already exists for ${email}.`);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    name: ADMIN_NAME,
    email,
    phone: ADMIN_PHONE,
    passwordHash,
    role: "admin",
    residencyId: residency._id
  });
  console.log(`Admin account created for ${email}`);
} catch (error) {
  console.error("Unable to create admin account:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
