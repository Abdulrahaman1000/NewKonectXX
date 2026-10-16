/**
 * Retrieval for the Smart Combo assistant (pure functions, no database here).
 *
 * Simple, honest keyword retrieval: we score each knowledge document against
 * the customer's question and keep the best few. Only those documents are shown
 * to the AI, so it can only answer from real shop data.
 */

export type DocType = "combo" | "gift" | "faq" | "policy";

export interface KDoc {
  id: string;
  type: DocType;
  title: string;
  text: string;
  link?: string;
  inStock?: boolean;
  price?: number;
}

const STOP = new Set(
  "a an the is are was were be been do does did can could would should will i you your we our my me it its of to for on in at by with and or but if so this that these those there what which who how when where why any some please tell about get have has not no yes just want need like very much more than then from as into up out".split(
    " ",
  ),
);

export function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

/** Finds a naira budget in the question: "₦50,000", "50k", "under 50000". */
export function parseBudget(q: string): number | null {
  const text = q.toLowerCase().replace(/,/g, "");
  const scale = (n: string, suffix?: string) => {
    let v = parseFloat(n);
    if (suffix === "k") v *= 1_000;
    if (suffix === "m") v *= 1_000_000;
    return v;
  };

  const patterns: RegExp[] = [
    /(?:₦|\bngn\b\s*|\bn(?=\d))\s*(\d+(?:\.\d+)?)\s*(k|m)?\b/,
    /\b(?:under|below|within|less than|up to|max(?:imum)?|budget(?: of)?|around|about)\s*(?:₦|ngn\s*|n(?=\d))?\s*(\d+(?:\.\d+)?)\s*(k|m)?\b/,
    /\b(\d+(?:\.\d+)?)\s*(k)\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const v = scale(m[1], m[2]);
      if (v >= 1000) return Math.round(v);
    }
  }
  return null;
}

const INTENTS: { id: string; words: string[] }[] = [
  { id: "policy:gift", words: ["gift", "free", "reward", "qualify", "unlock", "threshold"] },
  { id: "policy:delivery", words: ["deliver", "delivery", "shipping", "ship", "fee", "arrive", "cod", "cash", "dispatch", "transport"] },
  { id: "policy:combo", words: ["combo", "bundle", "offer", "save", "saving", "discount", "custom", "build"] },
  { id: "policy:payment", words: ["pay", "payment", "bank", "transfer", "paystack", "card", "flutterwave"] },
  { id: "policy:contact", words: ["contact", "whatsapp", "phone", "call", "address", "location", "email", "reach"] },
];

const BROWSE = /\b(available|in stock|what do you (have|sell)|products?|catalog(ue)?|list|options?|show me|everything)\b/i;
const GREETING = /^\s*(hi|hello|hey|good (morning|afternoon|evening)|howdy|yo|sup)\b[\s!.?]*$/i;

export function isGreeting(q: string): boolean {
  return GREETING.test(q);
}

export interface Retrieval {
  docs: KDoc[];
  budget: number | null;
  matched: boolean;
}

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

export function retrieve(question: string, all: KDoc[], limit = 6): Retrieval {
  const q = question.trim();
  const qTokens = tokenize(q);
  const qSet = new Set(qTokens);
  const lower = q.toLowerCase();
  const budget = parseBudget(q);

  const scored = new Map<string, { doc: KDoc; score: number }>();
  const bump = (doc: KDoc, s: number) => {
    const cur = scored.get(doc.id);
    if (cur) cur.score += s;
    else scored.set(doc.id, { doc, score: s });
  };

  for (const doc of all) {
    const titleTokens = new Set(tokenize(doc.title));
    const bodyTokens = new Set(tokenize(doc.text));
    let s = 0;
    for (const t of qSet) {
      if (titleTokens.has(t)) s += 3;
      else if (bodyTokens.has(t)) s += 1;
    }
    if (doc.title.length > 3 && lower.includes(doc.title.toLowerCase())) s += 6;
    if (s > 0) bump(doc, s);
  }

  // Intent boosts: policy documents the question is clearly about
  for (const intent of INTENTS) {
    if (intent.words.some((w) => qSet.has(stem(w)) || lower.includes(w))) {
      const doc = all.find((d) => d.id === intent.id);
      if (doc) bump(doc, 5);
    }
  }

  const extra: KDoc[] = [];

  // Budget question: build an exact list from the real catalogue
  if (budget) {
    const combos = all.filter((d) => d.type === "combo" && typeof d.price === "number");
    const within = combos.filter((d) => (d.price as number) <= budget);
    const inStock = within.filter((d) => d.inStock).sort((a, b) => (a.price as number) - (b.price as number));
    const out = within.filter((d) => !d.inStock);
    const lines = inStock.map((d) => `- ${d.title}: ${fmt(d.price as number)} (in stock) [${d.id}]`);
    const outLines = out.map((d) => `- ${d.title}: ${fmt(d.price as number)} (out of stock) [${d.id}]`);
    extra.push({
      id: "list:budget",
      type: "policy",
      title: `Combos within ${fmt(budget)}`,
      text: lines.length || outLines.length
        ? [...lines, ...outLines].join("\n")
        : `No active combo costs ${fmt(budget)} or less.`,
    });
  }

  // Browsing question: short overview of what's on sale
  if (BROWSE.test(q) && !budget) {
    const combos = all.filter((d) => d.type === "combo");
    extra.push({
      id: "list:catalogue",
      type: "policy",
      title: "Current combos",
      text: combos.length
        ? combos
            .slice(0, 15)
            .map((d) => `- ${d.title}: ${fmt(d.price ?? 0)} (${d.inStock ? "in stock" : "out of stock"}) [${d.id}]`)
            .join("\n")
        : "There are no active combos right now.",
    });
  }

  const ranked = [...scored.values()]
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.doc);

  const docs = [...extra, ...ranked.filter((d) => !extra.some((e) => e.id === d.id))].slice(0, limit + extra.length);
  return { docs, budget, matched: docs.length > 0 };
}
