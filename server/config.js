import "dotenv/config";

const required = ["MONGODB_URI", "JWT_SECRET"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

export const config = {
  port: Number(process.env.PORT || 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  textbeeApiKey: process.env.TEXTBEE_API_KEY?.trim(),
  textbeeDeviceId: process.env.TEXTBEE_DEVICE_ID?.trim()
};
