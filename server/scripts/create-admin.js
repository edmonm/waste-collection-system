import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../db.js";
import { User } from "../models/User.js";
import { Residency } from "../models/Residency.js";
import { Subdivision } from "../models/Subdivision.js";
import { philippinesMobileMessage, philippinesMobilePattern, temporaryPassword } from "../constants.js";

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_RESIDENCY_ID, ADMIN_SUBDIVISION_ID } = process.env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PHONE || !ADMIN_RESIDENCY_ID || !ADMIN_SUBDIVISION_ID) {
  throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_RESIDENCY_ID, and ADMIN_SUBDIVISION_ID in .env before creating an admin.");
}
if (!philippinesMobilePattern.test(ADMIN_PHONE)) {
  throw new Error(`ADMIN_PHONE: ${philippinesMobileMessage}`);
}
if (!/^[a-f\d]{24}$/i.test(ADMIN_RESIDENCY_ID)) {
  throw new Error("ADMIN_RESIDENCY_ID must be a valid residency ID created by a superadmin.");
}
if (!/^[a-f\d]{24}$/i.test(ADMIN_SUBDIVISION_ID)) {
  throw new Error("ADMIN_SUBDIVISION_ID must be a valid subdivision ID created by a superadmin.");
}

try {
  await connectDatabase();
  const residency = await Residency.findOne({ _id: ADMIN_RESIDENCY_ID, active: true });
  if (!residency) throw new Error("ADMIN_RESIDENCY_ID does not match an active residency.");
  const subdivision = await Subdivision.findOne({ _id: ADMIN_SUBDIVISION_ID, residencyId: residency._id });
  if (!subdivision) throw new Error("ADMIN_SUBDIVISION_ID does not match a subdivision in ADMIN_RESIDENCY_ID.");
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error(`An account already exists for ${email}.`);
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await User.create({
    name: ADMIN_NAME,
    email,
    phone: ADMIN_PHONE,
    passwordHash,
    role: "admin",
    mustChangePassword: true,
    residencyId: residency._id,
    subdivisionId: subdivision._id
  });
  console.log(`Admin account created for ${email}. The account must change its temporary password at first sign-in.`);
} catch (error) {
  console.error("Unable to create admin account:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
