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
  /** For lists built from the catalogue: ids of the combos listed, in order. */
  refs?: string[];
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

/** Different forms of the same word should match each other (withdraw / withdrawn / withdrawal). */
const SAME: Record<string, string> = {
  withdrawn: "withdraw", withdrawal: "withdraw", withdrawing: "withdraw", withdrew: "withdraw",
  paid: "pay", payment: "pay", payout: "pay", paying: "pay",
  earned: "earn", earning: "earn", earnings: "earn",
  delivered: "deliver", delivery: "deliver", delivering: "deliver",
  shipping: "ship", shipped: "ship", shipment: "ship",
  refunded: "refund", cancelled: "cancel", canceled: "cancel", cancellation: "cancel",
  ordering: "order", ordered: "order", buying: "buy", bought: "buy",
  registered: "register", registration: "register", signup: "register", join: "register", apply: "register", application: "register",
  returned: "return", returns: "return", returning: "return",
};

export function norm(w: string): string {
  const s = stem(w);
  return SAME[w] ?? SAME[s] ?? s;
}

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(norm);
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

/**
 * Everyday words that point at a group of knowledge entries. `ids` match exactly,
 * `prefix` matches every entry whose id starts with it.
 */
const INTENTS: { ids?: string[]; prefix?: string; words: string[] }[] = [
  { ids: ["policy:gift"], words: ["gift", "free", "reward", "qualify", "unlock", "threshold"] },
  { ids: ["policy:delivery"], words: ["deliver", "delivery", "shipping", "ship", "fee", "arrive", "cod", "cash on", "dispatch", "transport", "how long"] },
  { ids: ["policy:combo"], words: ["combo", "bundle", "offer", "save", "saving", "discount", "custom", "build"] },
  { ids: ["policy:payment"], words: ["pay", "payment", "bank", "transfer", "paystack", "card", "flutterwave"] },
  { ids: ["policy:contact"], words: ["contact", "whatsapp", "phone", "call", "address", "location", "email", "reach", "support", "human", "agent"] },
  { ids: ["policy:overview"], words: ["sell", "about", "who are you", "what is smart combo", "company", "store", "shop", "what do you", "tell me about smart combo"] },
  {
    prefix: "partner:",
    words: ["partner", "reseller", "resell", "affiliate", "commission", "earn", "earning", "withdraw", "withdrawal", "payout", "referral", "refer", "make money", "sell for you", "sell for smart", "side hustle", "agent program", "join you", "work with you"],
  },
  {
    prefix: "order:",
    words: ["track", "tracking", "my order", "order number", "order status", "status", "where is my", "how to order", "how do i order", "place an order", "checkout", "how to buy", "how do i buy", "shipped", "delivered"],
  },
  { prefix: "site:", words: ["return", "refund", "warranty", "guarantee", "privacy", "data", "terms", "policy", "exchange", "damaged", "faulty", "cancel"] },
];

const BROWSE = /\b(available|in stock|what do you (have|sell)|products?|catalog(ue)?|list|options?|show me|everything)\b/i;
const GREETING = /^\s*(hi|hello|hey|good (morning|afternoon|evening)|howdy|yo|sup)\b[\s!.?]*$/i;

export function isGreeting(q: string): boolean {
  return GREETING.test(q);
}

export interface Retrieval {
  docs: KDoc[];
  /** Relevance of each doc, same order as docs (lists built from the catalogue score 99). */
  scores: number[];
  budget: number | null;
  matched: boolean;
}

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

export function retrieve(question: string, all: KDoc[], limit = 8): Retrieval {
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

  // Intent boosts: entries the question is clearly about
  for (const intent of INTENTS) {
    const hit = intent.words.some((w) => (w.includes(" ") ? lower.includes(w) : qSet.has(norm(w))));
    if (!hit) continue;
    for (const doc of all) {
      const match = intent.ids ? intent.ids.includes(doc.id) : doc.id.startsWith(intent.prefix as string);
      if (match) bump(doc, intent.prefix ? 4 : 5);
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
      refs: [...inStock, ...out].map((d) => d.id),
      title: `Combos within ${fmt(budget)}`,
      text: lines.length || outLines.length
        ? [...lines, ...outLines].join("\n")
        : `No active combo costs ${fmt(budget)} or less.`,
    });
  }

  // Browsing question: short overview of what's on sale.
  // Not when the customer names a product ("is Avil in stock?"): they want that product.
  const namesAProduct = all.some(
    (d) => d.type === "combo" && d.title.length > 3 && lower.includes(d.title.toLowerCase()),
  );
  if (BROWSE.test(q) && !budget && !namesAProduct) {
    const combos = all.filter((d) => d.type === "combo");
    extra.push({
      id: "list:catalogue",
      type: "policy",
      refs: combos.slice(0, 15).map((d) => d.id),
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

  const rest = ranked.filter((d) => !extra.some((e) => e.id === d.id));
  const docs = [...extra, ...rest].slice(0, limit + extra.length);
  const scores = docs.map((d) => (extra.some((e) => e.id === d.id) ? 99 : (scored.get(d.id)?.score ?? 0)));
  return { docs, scores, budget, matched: docs.length > 0 };
}

/**
 * An answer built straight from our own written knowledge, with no AI.
 * Used when the AI is busy or down, but only when the best match is clearly on topic.
 */
export function directAnswer(r: Retrieval): { text: string; sourceIds: string[] } | null {
  if (!r.matched || r.scores[0] < 4) return null;
  const first = r.docs[0];
  const strip = (t: string) => t.replace(/ \[[^\]]+\]/g, "");

  if (first.id.startsWith("list:")) {
    return { text: `${first.title}:\n${strip(first.text)}`, sourceIds: [] };
  }

  const picked = [first];
  const second = r.docs[1];
  if (second && !second.id.startsWith("list:") && r.scores[1] >= r.scores[0] * 0.75) {
    const total = first.text.length + second.text.length;
    if (total < 900) picked.push(second);
  }

  const body = picked
    .map((d) => (d.type === "faq" ? `${d.title}\n${d.text}` : `${d.title}: ${d.text}`))
    .join("\n\n");
  return { text: `Here's what I have on that:\n\n${body}`, sourceIds: picked.map((d) => d.id) };
}


/**
 * A complete answer for "what can I buy within ₦X" / "what do you have", built from the
 * live catalogue in code. No AI needed, so it is instant, never cut off, and uses no quota.
 */
export function listAnswer(r: Retrieval): { text: string; refs: string[] } | null {
  const first = r.docs[0];
  if (!first || !first.id.startsWith("list:")) return null;

  const rows = first.text
    .split("\n")
    .map((l) => l.replace(/ \[[^\]]+\]$/, "").replace(/^- /, "").trim())
    .filter(Boolean);
  const MAX = 10;
  const shown = rows.slice(0, MAX).map((l) => `• ${l}`);
  const more = rows.length > MAX ? `\n…and ${rows.length - MAX} more. Ask me about any of them.` : "";

  const intro =
    first.id === "list:budget"
      ? rows[0]?.startsWith("No active combo")
        ? ""
        : `Here's what you can get within ${fmt(r.budget as number)}:`
      : "Here's what we have right now:";
  if (!intro) return { text: rows[0], refs: [] };
  return { text: `${intro}\n${shown.join("\n")}${more}`, refs: first.refs ?? [] };
}
