import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import combosRouter from "./routes/combos";
import settingsRouter from "./routes/settings";
import heroSlidesRouter from "./routes/heroSlides";
import testimonialsRouter from "./routes/testimonials";
import faqsRouter from "./routes/faqs";
import authRouter from "./routes/auth";
import ordersRouter from "./routes/orders";
import { connectDB } from "./db";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Database
  connectDB();

  // Built-in routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app.get("/api/demo", handleDemo);

  // API routes
  app.use("/api/auth", authRouter);
  app.use("/api/combos", combosRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/hero-slides", heroSlidesRouter);
  app.use("/api/testimonials", testimonialsRouter);
  app.use("/api/faqs", faqsRouter);
  app.use("/api/orders", ordersRouter);

  return app;
}
