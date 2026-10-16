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
import chatRouter from "./routes/chat";
import aiRouter from "./routes/ai";
import resellersRouter from "./routes/resellers";
import partnerRouter from "./routes/partner";
import giftRoutes from "./routes/admin/giftRoutes";
import publicGiftsRouter from "./routes/gifts";
import adminOrdersRouter from "./routes/admin/orders";
import adminDashboardRouter from "./routes/admin/dashboard";
import adminCategoriesRouter from "./routes/admin/categories";
import adminCombosRouter from "./routes/admin/combos";
import adminHeroSlidesRouter from "./routes/admin/heroSlides";
import adminSettingsRouter from "./routes/admin/settings";
import adminFaqsRouter from "./routes/admin/faqs";
import adminTestimonialsRouter from "./routes/admin/testimonials";
import adminChatsRouter from "./routes/admin/chats";
import adminResellersRouter from "./routes/admin/resellers";
import adminCommissionsRouter from "./routes/admin/commissions";
import adminAdsRouter from "./routes/admin/ads";
import adminWithdrawalsRouter from "./routes/admin/withdrawals";

import { requireAuth } from "./middleware/requireAuth";
import { connectDB } from "./db";

export function createServer() {
  const app = express();

  app.use(cors());

  // 50mb body limit for Base64 image payloads
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/payments/webhook/paystack") return next();
    if (req.originalUrl.startsWith("/api/ai")) return express.json({ limit: "20kb" })(req, res, next);
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
  app.use("/api/chat", chatRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/resellers", resellersRouter);
  app.use("/api/partner", partnerRouter);

  // Gifts: the shop can only READ active gifts. Changing gifts needs the admin login.
  app.use("/api/gifts", publicGiftsRouter);

  // Admin API routes (Protected by authentication)
  app.use("/api/admin/gifts", requireAuth, giftRoutes);
  app.use("/api/admin/orders", requireAuth, adminOrdersRouter);
  app.use("/api/admin/dashboard", requireAuth, adminDashboardRouter);
  app.use("/api/admin/categories", requireAuth, adminCategoriesRouter);
  app.use("/api/admin/combos", requireAuth, adminCombosRouter);
  app.use("/api/admin/hero-slides", requireAuth, adminHeroSlidesRouter);
  app.use("/api/admin/settings", requireAuth, adminSettingsRouter);
  app.use("/api/admin/faqs", requireAuth, adminFaqsRouter);
  app.use("/api/admin/testimonials", requireAuth, adminTestimonialsRouter);
  app.use("/api/admin/chats", requireAuth, adminChatsRouter);
  app.use("/api/admin/resellers", requireAuth, adminResellersRouter);
  app.use("/api/admin/commissions", requireAuth, adminCommissionsRouter);
  app.use("/api/admin/ads", requireAuth, adminAdsRouter);
  app.use("/api/admin/withdrawals", requireAuth, adminWithdrawalsRouter);

  return app;
}
