/**
 * Admin chat routes. Mounted under requireAuth (admin login required).
 *
 * GET    /api/admin/chats               — inbox, newest first
 * GET    /api/admin/chats/unread-count  — number of chats with unread customer messages
 * GET    /api/admin/chats/:id           — full conversation (marks it read)
 * POST   /api/admin/chats/:id/messages  — reply { text }
 * DELETE /api/admin/chats/:id           — delete a conversation
 */

import { Router, Request, Response } from "express";
import { ChatConversation } from "../../models/ChatConversation";

const router = Router();

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const toPublic = (m: any) => ({
  id: String(m._id),
  sender: m.sender,
  text: m.text,
  createdAt: m.createdAt,
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const list = await ChatConversation.find({})
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .select("name phone lastMessagePreview lastMessageAt unreadForAdmin")
      .lean();
    res.json({
      data: list.map((c: any) => ({
        id: String(c._id),
        name: c.name,
        phone: c.phone,
        lastMessagePreview: c.lastMessagePreview,
        lastMessageAt: c.lastMessageAt,
        unreadForAdmin: c.unreadForAdmin,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/chats failed:", e);
    fail(res, 500, "SERVER_ERROR", "Failed to load chats");
  }
});

// Must be defined before "/:id"
router.get("/unread-count", async (_req: Request, res: Response) => {
  try {
    const count = await ChatConversation.countDocuments({ unreadForAdmin: { $gt: 0 } });
    res.json({ data: { count } });
  } catch (e) {
    fail(res, 500, "SERVER_ERROR", "Failed to count chats");
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const convo: any = await ChatConversation.findById(req.params.id).lean();
    if (!convo) return fail(res, 404, "NOT_FOUND", "Chat not found");
    if (convo.unreadForAdmin > 0) {
      await ChatConversation.updateOne({ _id: convo._id }, { $set: { unreadForAdmin: 0 } });
    }
    res.json({
      data: {
        id: String(convo._id),
        name: convo.name,
        phone: convo.phone,
        createdAt: convo.createdAt,
        messages: convo.messages.map(toPublic),
      },
    });
  } catch (e: any) {
    if (e.name === "CastError") return fail(res, 404, "NOT_FOUND", "Chat not found");
    console.error("GET /api/admin/chats/:id failed:", e);
    fail(res, 500, "SERVER_ERROR", "Failed to load chat");
  }
});

router.post("/:id/messages", async (req: Request, res: Response) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 1000) : "";
    if (!text) return fail(res, 400, "BAD_REQUEST", "Reply cannot be empty");
    const now = new Date();
    const updated: any = await ChatConversation.findByIdAndUpdate(
      req.params.id,
      {
        $push: { messages: { sender: "admin", text, createdAt: now } },
        $set: { lastMessageAt: now, lastMessagePreview: `You: ${text.slice(0, 110)}` },
        $inc: { unreadForCustomer: 1 },
      },
      { new: true },
    ).lean();
    if (!updated) return fail(res, 404, "NOT_FOUND", "Chat not found");
    const last = updated.messages[updated.messages.length - 1];
    res.status(201).json({ data: toPublic(last) });
  } catch (e: any) {
    if (e.name === "CastError") return fail(res, 404, "NOT_FOUND", "Chat not found");
    console.error("POST /api/admin/chats/:id/messages failed:", e);
    fail(res, 500, "SERVER_ERROR", "Failed to send reply");
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const out = await ChatConversation.findByIdAndDelete(req.params.id);
    if (!out) return fail(res, 404, "NOT_FOUND", "Chat not found");
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (e: any) {
    if (e.name === "CastError") return fail(res, 404, "NOT_FOUND", "Chat not found");
    fail(res, 500, "SERVER_ERROR", "Failed to delete chat");
  }
});

export default router;
