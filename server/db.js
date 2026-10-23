import mongoose from "mongoose";
import { config } from "./config.js";
import { User } from "./models/User.js";

export async function connectDatabase() {
  await mongoose.connect(config.mongoUri);
  await User.updateMany({ role: "resident" }, { $set: { role: "user" } });
  console.log("Connected to MongoDB");
}
