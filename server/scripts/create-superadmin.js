import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../db.js";
import { User } from "../models/User.js";

const { SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_PHONE } = process.env;
if (!SUPERADMIN_NAME || !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD || !SUPERADMIN_PHONE) {
  throw new Error("Set SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, and SUPERADMIN_PHONE in .env.");
}
if (SUPERADMIN_PASSWORD.length < 8 || SUPERADMIN_PASSWORD.length > 72) {
  throw new Error("SUPERADMIN_PASSWORD must be between 8 and 72 characters.");
}
if (!/^\+[1-9]\d{7,14}$/.test(SUPERADMIN_PHONE)) {
  throw new Error("SUPERADMIN_PHONE must use international format, for example +15551234567.");
}

try {
  await connectDatabase();
  const email = SUPERADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error(`An account already exists for ${email}.`);
  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
  await User.create({
    name: SUPERADMIN_NAME,
    email,
    phone: SUPERADMIN_PHONE,
    passwordHash,
    role: "superadmin"
  });
  console.log(`Superadmin account created for ${email}`);
} catch (error) {
  console.error("Unable to create superadmin account:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
