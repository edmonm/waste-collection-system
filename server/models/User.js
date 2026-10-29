import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  mustChangePassword: { type: Boolean, default: false, required: true },
  role: { type: String, enum: ["superadmin", "admin", "user", "resident"], default: "user", required: true },
  residencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Residency", default: null }
}, { timestamps: true });

userSchema.index({ name: 1, _id: 1 });
userSchema.index({ phone: 1, _id: 1 });
userSchema.index({ residencyId: 1, role: 1, name: 1, _id: 1 });

export const User = mongoose.model("User", userSchema);
