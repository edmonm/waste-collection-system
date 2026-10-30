import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import scheduleRoutes from "./routes/schedules.js";
import requestRoutes from "./routes/requests.js";
import residencyRoutes from "./routes/residencies.js";
import userRoutes from "./routes/users.js";
import subdivisionRoutes from "./routes/subdivisions.js";
import path from "path";
import { fileURLToPath } from "url";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "community-waste-collection-api" });
});

app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
}), authRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/residencies", residencyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subdivisions", subdivisionRoutes);


app.use(express.static(path.join(__dirname, "../dist")));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});


app.use((_request, response) => {
  response.status(404).json({ error: "Endpoint not found." });
});



app.use((error, _request, response, _next) => {
  if (error.name === "ValidationError" || error.name === "ZodError") {
    return response.status(400).json({ error: "Please check the submitted information.", details: error.issues });
  }
  if (error.code === 11000) {
    return response.status(409).json({ error: "An account with that email already exists." });
  }
  console.error(error);
  return response.status(error.status || 500).json({ error: error.status ? error.message : "An unexpected server error occurred." });
});
