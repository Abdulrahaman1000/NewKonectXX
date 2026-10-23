/**
 * requireAuth middleware.  (SC-STAFF version)
 *
 * Verifies the JWT, then re-reads the user from the database on every request,
 * so disabling a staff member or changing their role takes effect immediately.
 * Attaches { userId, email, name, role, staffRole, permissions } to req.user.
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AdminUser } from "../models/AdminUser";
import { permissionsFor } from "../permissions";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void | Response> {
  if ((req as any).user?._fresh) return next(); // already checked earlier in this request

  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Missing auth token" },
    });
  }
  const token = authHeader.slice("Bearer ".length);

  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: { code: "TOKEN_EXPIRED", message: "Session expired, please log in again" },
      });
    }
    return res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Invalid auth token" },
    });
  }

  try {
    const u: any = await AdminUser.findById(payload.userId).select("email name role staffRole active").lean();
    if (!u || u.active === false) {
      return res.status(401).json({
        error: { code: "ACCOUNT_DISABLED", message: "This account is no longer active" },
      });
    }
    (req as any).user = {
      userId: String(u._id),
      email: u.email,
      name: u.name,
      role: u.role,
      staffRole: u.staffRole,
      permissions: permissionsFor(u),
      _fresh: true,
    };
    next();
  } catch (err) {
    console.error("requireAuth lookup failed:", err);
    return res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Could not verify your login" },
    });
  }
}
