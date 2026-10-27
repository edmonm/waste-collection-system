import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { Residency } from "../models/Residency.js";

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
  if (payload.purpose === "password-change") {
    return response.status(403).json({ error: "Change your temporary password before continuing." });
  }

  const user = await User.findById(payload.sub).select("name email phone role residencyId mustChangePassword");
  if (!user) return response.status(401).json({ error: "This account is no longer available." });
  if (user.mustChangePassword) {
    return response.status(403).json({ error: "Change your temporary password before continuing." });
  }
  if (user.role !== "superadmin") {
    if (!user.residencyId) {
      return response.status(403).json({ error: "Your account needs a residency assignment. Ask a superadmin to assign one." });
    }
    const activeResidency = await Residency.exists({ _id: user.residencyId, active: true });
    if (!activeResidency) {
      return response.status(403).json({ error: "Your residency is inactive. Contact a superadmin for assistance." });
    }
  }
  request.user = user;
  return next();
}

export function requireAnyRole(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ error: "You do not have permission to perform this action." });
    }
    return next();
  };
}

export function requireRole(role) {
  return (request, response, next) => {
    if (request.user.role !== role) {
      return response.status(403).json({ error: "You do not have permission to perform this action." });
    }
    return next();
  };
}
