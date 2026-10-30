import mongoose from "mongoose";

const subdivisionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  nameKey: { type: String, required: true },
  residencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Residency", required: true }
}, { timestamps: true });

subdivisionSchema.index({ residencyId: 1, nameKey: 1 }, { unique: true });

export const Subdivision = mongoose.model("Subdivision", subdivisionSchema);
