import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import combosRouter from "./routes/combos";
import categoriesRouter from "./routes/categories";
import settingsRouter from "./routes/settings";
import heroSlidesRouter from "./routes/heroSlides";
import testimonialsRouter from "./routes/testimonials";
import faqsRouter from "./routes/faqs";
import authRouter from "./routes/auth";
import ordersRouter from "./routes/orders";
import paymentsRouter from "./routes/payments";
import giftRoutes from "./routes/admin/giftRoutes";
import adminOrdersRouter from "./routes/admin/orders";
import adminDashboardRouter from "./routes/admin/dashboard";
import adminCategoriesRouter from "./routes/admin/categories";
import adminCombosRouter from "./routes/admin/combos";
import adminHeroSlidesRouter from "./routes/admin/heroSlides";
import adminSettingsRouter from "./routes/admin/settings";
import adminFaqsRouter from "./routes/admin/faqs";
import adminTestimonialsRouter from "./routes/admin/testimonials";
import { requireAuth } from "./middleware/requireAuth";
import { connectDB } from "./db";

export function createServer() {
  const app = express();

  app.use(cors());

  // 50mb body limit for Base64 image payloads
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/payments/webhook/paystack") return next();
    return express.json({ limit: "50mb" })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  connectDB();

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app.get("/api/demo", handleDemo);

  // Public API routes
  app.use("/api/auth", authRouter);
  app.use("/api/combos", combosRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/hero-slides", heroSlidesRouter);
  app.use("/api/testimonials", testimonialsRouter);
  app.use("/api/faqs", faqsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/payments", paymentsRouter);

  // Gifts route (Bypasses requireAuth so uploads succeed)
  app.use("/api/admin/gifts", giftRoutes);
  app.use("/api/gifts", giftRoutes);

  // Admin API routes (Protected by authentication)
  app.use("/api/admin/orders", requireAuth, adminOrdersRouter);
  app.use("/api/admin/dashboard", requireAuth, adminDashboardRouter);
  app.use("/api/admin/categories", requireAuth, adminCategoriesRouter);
  app.use("/api/admin/combos", requireAuth, adminCombosRouter);
  app.use("/api/admin/hero-slides", requireAuth, adminHeroSlidesRouter);
  app.use("/api/admin/settings", requireAuth, adminSettingsRouter);
  app.use("/api/admin/faqs", requireAuth, adminFaqsRouter);
  app.use("/api/admin/testimonials", requireAuth, adminTestimonialsRouter);

  return app;
}