import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  area: { type: String, required: true, trim: true, maxlength: 100 },
  date: { type: Date, required: true },
  estimatedArrivalTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
  wasteType: { type: String, required: true, enum: ["General waste", "Recycling", "Green waste", "Bulk collection"] },
  notes: { type: String, trim: true, maxlength: 300, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  residencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Residency", required: true }
}, { timestamps: true });

export const Schedule = mongoose.model("Schedule", scheduleSchema);
