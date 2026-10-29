import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema({
  resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["special_request", "missed_pickup"], required: true },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ["pending", "approved", "declined", "reviewed"], default: "pending" },
  scheduledDate: { type: Date, default: null },
  declineReason: { type: String, trim: true, maxlength: 500, default: "" },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  residencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Residency", required: true }
}, { timestamps: true });

serviceRequestSchema.index({ residencyId: 1, status: 1, createdAt: -1, _id: -1 });
serviceRequestSchema.index({ residencyId: 1, kind: 1, createdAt: -1, _id: -1 });
serviceRequestSchema.index({ resident: 1, createdAt: -1, _id: -1 });

export const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
