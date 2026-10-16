/**
 * AI shopping assistant.  POST /api/ai/chat
 *
 * Body:    { messages: [{ role: "user" | "assistant", text }] }   (last one is the customer's question)
 * Returns: { data: { answer, sources: [{id,title,link}], needsHuman } }
 *
 * Separate from checkout, payments and the human chat. Nothing is stored.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { getKnowledge } from "../ai/knowledge";
import { retrieve, isGreeting } from "../ai/retrieve";
import { askGemini, AIError } from "../ai/gemini";

const router = Router();

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(12),
});

// ---- limits: per visitor, plus a daily cap so the free quota is never burned by one person ----
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
  for (const [k, arr] of hits) if (!arr.some((t) => now - t < 3600_000)) hits.delete(k);
}, 10 * 60 * 1000).unref?.();

let day = "";
let dayCount = 0;
function overDailyCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  const cap = parseInt(process.env.AI_DAILY_LIMIT || "300", 10);
  if (dayCount >= cap) return true;
  dayCount++;
  return false;
}

const visitor = (req: Request) =>
  String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown").split(",")[0].trim();

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "BAD_REQUEST", "Please type a shorter question.");
    const { messages } = parsed.data;
    const last = messages[messages.length - 1];
    if (last.role !== "user") return fail(res, 400, "BAD_REQUEST", "Please type a question.");

    const who = visitor(req);
    if (limited(`min:${who}`, 8, 60_000) || limited(`hr:${who}`, 60, 3600_000)) {
      return fail(res, 429, "RATE_LIMIT", "You're asking too fast. Please wait a moment.");
    }

    if (isGreeting(last.text)) {
      return res.json({
        data: {
          answer:
            "Hi! 👋 I can help with our combos, prices, free gifts and delivery. What would you like to know?",
          sources: [],
          needsHuman: false,
        },
      });
    }

    const knowledge = await getKnowledge();
    const found = retrieve(last.text, knowledge);

    // Nothing relevant in the shop's data: say so, don't spend AI quota, offer a person
    if (!found.matched) {
      return res.json({
        data: {
          answer:
            "I don't have that information. I can help with our combos, prices, free gifts and delivery, or you can talk to our team.",
          sources: [],
          needsHuman: true,
        },
      });
    }

    if (overDailyCap()) {
      return fail(res, 503, "BUSY", "Our assistant is very busy today. Please talk to our team instead.");
    }

    const result = await askGemini(
      messages.map((m) => ({ role: m.role, text: m.text })),
      found.docs,
    );

    // Only return sources the AI could really have used
    const byId = new Map(found.docs.map((d) => [d.id, d]));
    const sources = result.sources
      .filter((id) => byId.has(id) && !id.startsWith("list:"))
      .slice(0, 4)
      .map((id) => {
        const d = byId.get(id)!;
        return { id: d.id, title: d.title, link: d.link ?? null };
      });

    res.json({
      data: {
        answer: result.answer || "Sorry, I couldn't answer that. Please talk to our team.",
        sources,
        needsHuman: result.needsHuman || !result.answer,
      },
    });
  } catch (e) {
    if (e instanceof AIError) {
      const status = e.code === "UNAVAILABLE" ? 503 : e.code === "BUSY" ? 503 : 502;
      return fail(res, status, e.code, "Our assistant isn't available right now. Please talk to our team.");
    }
    console.error("POST /api/ai/chat failed:", e);
    fail(res, 500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
});

export default router;
