/**
 * requireAuth middleware.
 *
 * Verifies the JWT in the Authorization header.
 * If valid, attaches { userId, email, role } to req.user and calls next().
 * If missing/invalid/expired, responds with 401.
 *
 * Usage on routes:
 *   router.get("/admin/orders", requireAuth, listOrdersHandler);
 *
 * Or apply to a whole router:
 *   app.use("/api/admin", requireAuth, adminRouter);
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void | Response {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Missing auth token" },
    });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    (req as any).user = payload;
    next();
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
}
