import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema({
  resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["special_request", "missed_pickup"], required: true },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ["pending", "approved", "declined", "reviewed"], default: "pending" },
  scheduledDate: { type: Date, default: null },
  scheduledTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: null },
  scheduledAt: { type: Date, default: null },
  scheduledSmsStatus: { type: String, enum: ["pending", "sending", "sent", null], default: null },
  scheduledSmsClaimedAt: { type: Date, default: null },
  scheduledSmsNextAttemptAt: { type: Date, default: null },
  scheduledSmsSentAt: { type: Date, default: null },
  declineReason: { type: String, trim: true, maxlength: 500, default: "" },
  residencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Residency", required: true }
}, { timestamps: true });

export const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
