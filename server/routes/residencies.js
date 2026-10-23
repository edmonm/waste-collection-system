import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Residency } from "../models/Residency.js";

const router = Router();

router.use(authenticate, requireRole("superadmin"));

router.get("/", async (_request, response, next) => {
  try {
    const residencies = await Residency.find().sort({ name: 1 }).lean();
    return response.json({ residencies });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const { name } = z.object({ name: z.string().trim().min(2).max(100) }).parse(request.body);
    const residency = await Residency.create({ name });
    return response.status(201).json({ residency });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: "A residency with that name already exists." });
    return next(error);
  }
});

router.patch("/:id", async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Invalid residency identifier." });
    }
    const { active } = z.object({ active: z.boolean() }).parse(request.body);
    const residency = await Residency.findByIdAndUpdate(
      request.params.id,
      { active },
      { new: true, runValidators: true }
    );
    if (!residency) return response.status(404).json({ error: "Residency not found." });
    return response.json({ residency });
  } catch (error) {
    return next(error);
  }
});

export default router;
