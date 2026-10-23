import mongoose from "mongoose";

const residencySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export const Residency = mongoose.model("Residency", residencySchema);
