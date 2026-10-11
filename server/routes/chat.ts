/**
 * Public chat routes (no login). The customer's secret `token` identifies
 * their conversation.
 *
 * POST /api/chat/start              — begin a chat { name, phone?, message }
 * GET  /api/chat/:token             — fetch messages (also marks admin replies as read)
 * GET  /api/chat/:token/unread      — count of unread admin replies
 * POST /api/chat/:token/messages    — send a message { text }
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { ChatConversation } from "../models/ChatConversation";
import { sendChatAlert } from "../services/chatNotify";

const router = Router();

const MAX_TEXT = 1000;
const MAX_MESSAGES = 300;
const ALERT_EVERY_MS = 15 * 60 * 1000;
const TOKEN_RE = /^[a-f0-9]{48}$/;

// ---- tiny in-memory rate limiter (best effort) ----
const hits = new Map<string, number[]>();
function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of hits) {
    if (!arr.some((t) => now - t < 3600_000)) hits.delete(k);
  }
}, 10 * 60 * 1000).unref?.();

const clean = (v: any, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const err = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const toPublic = (m: any) => ({
  id: String(m._id),
  sender: m.sender,
  text: m.text,
  createdAt: m.createdAt,
});

// Start a new conversation
router.post("/start", async (req: Request, res: Response) => {
  try {
    if (limited(`start:${req.ip}`, 5, 3600_000)) {
      return err(res, 429, "RATE_LIMIT", "Too many chats started. Please try again later.");
    }
    const name = clean(req.body?.name, 60);
    const phone = clean(req.body?.phone, 30);
    const text = clean(req.body?.message, MAX_TEXT);
    if (!name) return err(res, 400, "BAD_REQUEST", "Please enter your name");
    if (!text) return err(res, 400, "BAD_REQUEST", "Please type a message");

    const token = crypto.randomBytes(24).toString("hex");
    const now = new Date();
    const convo = await ChatConversation.create({
      token,
      name,
      phone,
      messages: [{ sender: "customer", text, createdAt: now }],
      lastMessageAt: now,
      lastMessagePreview: text.slice(0, 120),
      unreadForAdmin: 1,
      lastAdminAlertAt: now,
    });

    void sendChatAlert({ name, phone, text, isNew: true });

    res.status(201).json({
      data: { token, name, messages: convo.messages.map(toPublic) },
    });
  } catch (e) {
    console.error("POST /api/chat/start failed:", e);
    err(res, 500, "SERVER_ERROR", "Could not start chat");
  }
});

// Fetch the conversation
router.get("/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!TOKEN_RE.test(token)) return err(res, 404, "NOT_FOUND", "Chat not found");
    if (limited(`get:${token}`, 60, 60_000)) return err(res, 429, "RATE_LIMIT", "Slow down");

    const convo = await ChatConversation.findOne({ token }).lean();
    if (!convo) return err(res, 404, "NOT_FOUND", "Chat not found");

    if (convo.unreadForCustomer > 0) {
      await ChatConversation.updateOne({ token }, { $set: { unreadForCustomer: 0 } });
    }
    res.json({ data: { name: convo.name, messages: convo.messages.slice(-200).map(toPublic) } });
  } catch (e) {
    console.error("GET /api/chat/:token failed:", e);
    err(res, 500, "SERVER_ERROR", "Could not load chat");
  }
});

// Unread admin replies (lightweight, doesn't mark as read)
router.get("/:token/unread", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!TOKEN_RE.test(token)) return err(res, 404, "NOT_FOUND", "Chat not found");
    if (limited(`unread:${token}`, 30, 60_000)) return err(res, 429, "RATE_LIMIT", "Slow down");
    const convo = await ChatConversation.findOne({ token }).select("unreadForCustomer").lean();
    if (!convo) return err(res, 404, "NOT_FOUND", "Chat not found");
    res.json({ data: { unread: convo.unreadForCustomer } });
  } catch (e) {
    err(res, 500, "SERVER_ERROR", "Could not check chat");
  }
});

// Send a message
router.post("/:token/messages", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!TOKEN_RE.test(token)) return err(res, 404, "NOT_FOUND", "Chat not found");
    if (limited(`msg:${token}`, 15, 60_000)) {
      return err(res, 429, "RATE_LIMIT", "You're sending messages too fast. Please wait a moment.");
    }
    const text = clean(req.body?.text, MAX_TEXT);
    if (!text) return err(res, 400, "BAD_REQUEST", "Message cannot be empty");

    const convo = await ChatConversation.findOne({ token }).select("name phone lastAdminAlertAt").lean();
    if (!convo) return err(res, 404, "NOT_FOUND", "Chat not found");

    const full = await ChatConversation.countDocuments({
      token,
      [`messages.${MAX_MESSAGES - 1}`]: { $exists: true },
    });
    if (full > 0) {
      return err(res, 400, "CHAT_FULL", "This chat is full. Please contact us on WhatsApp.");
    }

    const now = new Date();
    const shouldAlert =
      !convo.lastAdminAlertAt || now.getTime() - new Date(convo.lastAdminAlertAt).getTime() > ALERT_EVERY_MS;

    const updated = await ChatConversation.findOneAndUpdate(
      { token },
      {
        $push: { messages: { sender: "customer", text, createdAt: now } },
        $set: {
          lastMessageAt: now,
          lastMessagePreview: text.slice(0, 120),
          ...(shouldAlert ? { lastAdminAlertAt: now } : {}),
        },
        $inc: { unreadForAdmin: 1 },
      },
      { new: true },
    ).lean();

    if (shouldAlert) void sendChatAlert({ name: convo.name, phone: convo.phone, text, isNew: false });

    const last = updated?.messages[updated.messages.length - 1];
    res.status(201).json({ data: last ? toPublic(last) : null });
  } catch (e) {
    console.error("POST /api/chat/:token/messages failed:", e);
    err(res, 500, "SERVER_ERROR", "Could not send message");
  }
});

export default router;
