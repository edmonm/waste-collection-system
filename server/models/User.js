import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["superadmin", "admin", "user", "resident"], default: "user", required: true },
  residencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Residency", default: null }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
