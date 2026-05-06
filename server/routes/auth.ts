/**
 * Auth routes — admin login.
 *
 * POST /api/auth/login   — exchanges email + password for a JWT
 * GET  /api/auth/me      — returns current admin user (requires valid JWT)
 *
 * The JWT contains the admin's userId and role. It expires after 7 days
 * (configurable via JWT_EXPIRES_IN env var).
 */

import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AdminUser } from "../models/AdminUser";
import { config } from "../config";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Email and password required" },
      });
    }

    const user = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether email exists — same error for both cases
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    const valid = await user.verifyPassword(password);
    if (!valid) {
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions,
    );

    res.json({
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Login failed" },
    });
  }
});

// GET /api/auth/me — requires valid JWT
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    // requireAuth attaches the user to req.user
    const user = await AdminUser.findById((req as any).user.userId).lean();
    if (!user) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    res.json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error("GET /api/auth/me failed:", err);
    res.status(500).json({
      error: { code: "SERVER_ERROR", message: "Failed to fetch user" },
    });
  }
});

export default router;
