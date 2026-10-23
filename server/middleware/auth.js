import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";

export async function authenticate(request, response, next) {
  const [scheme, token] = (request.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ error: "Please sign in to continue." });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return response.status(401).json({ error: "Your session has expired. Please sign in again." });
  }

  const user = await User.findById(payload.sub).select("name email phone role");
  if (!user) return response.status(401).json({ error: "This account is no longer available." });
  request.user = user;
  return next();
}

export function requireRole(role) {
  return (request, response, next) => {
    if (request.user.role !== role) {
      return response.status(403).json({ error: "You do not have permission to perform this action." });
    }
    return next();
  };
}
