import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  area: { type: String, required: true, trim: true, maxlength: 100 },
  date: { type: Date, required: true },
  estimatedArrivalTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
  wasteType: { type: String, required: true, enum: ["General waste", "Recycling", "Green waste", "Bulk collection"] },
  notes: { type: String, trim: true, maxlength: 300, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  residencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Residency", required: true },
  status: { type: String, enum: ["scheduled", "cancelled"], default: "scheduled", required: true },
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  cancellationReason: { type: String, trim: true, maxlength: 500, default: "" },
  history: [{
    action: { type: String, enum: ["updated", "cancelled"], required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    changes: [{
      field: { type: String, required: true },
      from: { type: String, required: true },
      to: { type: String, required: true }
    }],
    reason: { type: String, trim: true, maxlength: 500, default: "" }
  }]
}, { timestamps: true, optimisticConcurrency: true });

scheduleSchema.index({ residencyId: 1, status: 1, date: 1, _id: 1 });

export const Schedule = mongoose.model("Schedule", scheduleSchema);
