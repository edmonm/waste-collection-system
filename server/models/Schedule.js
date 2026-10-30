import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  area: { type: String, required: true, trim: true, maxlength: 100 },
  date: { type: Date, required: true },
  estimatedArrivalTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
  scheduledAt: { type: Date, default: null },
  scheduledSmsStatus: { type: String, enum: ["pending", "sending", "sent", null], default: null },
  scheduledSmsClaimedAt: { type: Date, default: null },
  scheduledSmsNextAttemptAt: { type: Date, default: null },
  scheduledSmsSentAt: { type: Date, default: null },
  wasteType: { type: String, required: true, enum: ["General waste", "Recycling", "Green waste", "Bulk collection"] },
  notes: { type: String, trim: true, maxlength: 300, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  residencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Residency", required: true },
  subdivisionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subdivision", default: null }
}, { timestamps: true });

scheduleSchema.index({ scheduledAt: 1, scheduledSmsStatus: 1 });

export const Schedule = mongoose.model("Schedule", scheduleSchema);
