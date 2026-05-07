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
import adminOrdersRouter from "./routes/admin/orders";
import adminDashboardRouter from "./routes/admin/dashboard";
import adminCategoriesRouter from "./routes/admin/categories";
import { requireAuth } from "./middleware/requireAuth";
import { connectDB } from "./db";

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  // Admin API routes (protected)
  app.use("/api/admin/orders", requireAuth, adminOrdersRouter);
  app.use("/api/admin/dashboard", requireAuth, adminDashboardRouter);
  app.use("/api/admin/categories", requireAuth, adminCategoriesRouter);

  return app;
}
