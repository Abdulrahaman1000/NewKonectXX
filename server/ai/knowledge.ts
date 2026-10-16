/**
 * Builds the assistant's knowledge from the live database: active combos,
 * gifts in stock, published FAQs, and the shop's real rules. Cached for 60s.
 *
 * Nothing here is invented: every price, stock count and rule comes from your
 * database or from code that checkout itself uses.
 */

import { Combo } from "../models/Combo";
import { Gift } from "../models/Gift";
import { FAQ } from "../models/FAQ";
import { SiteSettings } from "../models/SiteSettings";
import { Category } from "../models/Category";
import { getProgramSettings } from "../models/Commission";
import siteContent from "./siteContent.json";
import { GIFT_THRESHOLD, GIFT_WINDOW_DAYS } from "../services/giftProgress";
import type { KDoc } from "./retrieve";

const TTL_MS = 60_000;
let cache: { at: number; docs: KDoc[] } | null = null;

const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const cut = (s: unknown, max = 500) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Splits long page text into pieces at line breaks so each piece can be found on its own. */
function chunk(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const line of String(text).split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
    if (cur && cur.length + line.length > max) {
      out.push(cur);
      cur = "";
    }
    cur += (cur ? " " : "") + line;
  }
  if (cur) out.push(cur);
  return out;
}

export async function getKnowledge(): Promise<KDoc[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.docs;

  const [combos, gifts, faqs, settings, categories, program] = await Promise.all([
    Combo.find({ isActive: true }).sort({ isFeatured: -1, createdAt: -1 }).limit(60).lean(),
    Gift.find({ isActive: { $ne: false }, stock: { $gt: 0 } }).limit(30).lean(),
    FAQ.find({ isPublished: true }).sort({ order: 1 }).limit(40).lean(),
    SiteSettings.findOne().lean(),
    Category.find({ isActive: true }).sort({ displayOrder: 1 }).limit(30).lean(),
    getProgramSettings().catch(() => null),
  ]);

  const docs: KDoc[] = [];

  for (const c of combos as any[]) {
    const inStock = (c.stockLeft ?? 0) > 0;
    const save = Math.max(0, (c.originalPrice ?? 0) - (c.totalPrice ?? 0));
    const items = (c.items ?? [])
      .map((it: any) => {
        const alts = (it.alternatives ?? []).map((a: any) => a.name).filter(Boolean);
        const colors = (it.colors ?? []).map((k: any) => k.name).filter(Boolean);
        return (
          cut(it.name, 80) +
          (it.individualPrice ? ` (${naira(it.individualPrice)} on its own)` : "") +
          (alts.length ? ` — alternatives: ${alts.slice(0, 5).join(", ")}` : "") +
          (colors.length ? ` — colours: ${colors.slice(0, 8).join(", ")}` : "")
        );
      })
      .join("; ");
    docs.push({
      id: `combo:${c.slug}`,
      type: "combo",
      title: cut(c.name, 80),
      price: c.totalPrice,
      inStock,
      link: `/combos/${c.slug}`,
      text: cut(
        `${c.tagline ? c.tagline + ". " : ""}Combo price ${naira(c.totalPrice)}` +
          (save > 0 ? ` (normally ${naira(c.originalPrice)}, you save ${naira(save)})` : "") +
          `. ${inStock ? `In stock, ${c.stockLeft} left` : "Out of stock"}.` +
          (items ? ` Includes: ${items}.` : ""),
        900,
      ),
    });
  }

  for (const f of faqs as any[]) {
    docs.push({
      id: `faq:${f._id}`,
      type: "faq",
      title: cut(f.question, 120),
      text: cut(f.answer, 700),
      link: "/faq",
    });
  }

  // ---- Rules that checkout really applies ----
  const ship = (settings as any)?.shipping;
  const contact = (settings as any)?.contact;
  const cities: string[] = (ship?.codCities ?? []).filter(Boolean);

  if (ship) {
    docs.push({
      id: "policy:delivery",
      type: "policy",
      title: "Delivery fee and cash on delivery",
      link: "/shipping",
      text:
        `The standard delivery fee is ${naira(ship.standardFee ?? 0)}. ` +
        (cities.length
          ? `If the customer pays cash on delivery in ${cities.join(", ")}, the delivery fee is ${naira(0)}. `
          : "") +
        "The exact fee is always shown at checkout before paying.",
    });
  }

  docs.push({
    id: "policy:gift",
    type: "policy",
    title: "How to qualify for a free gift",
    text:
      `A customer unlocks the free gift when what they spent in the last ${GIFT_WINDOW_DAYS} days plus the current order reaches ${naira(GIFT_THRESHOLD)}. ` +
      "Spending is added up by phone number. An order counts once it is paid; cash-on-delivery orders count once delivered. Cancelled and refunded orders never count. " +
      "After a gift is given, the total starts again from zero." +
      (gifts.length ? ` Gifts available now: ${(gifts as any[]).map((g) => cut(g.name, 60)).join(", ")}.` : " No gifts are in stock right now."),
  });

  docs.push({
    id: "policy:combo",
    type: "policy",
    title: "How combos work",
    link: "/products",
    text:
      "A combo bundles several items at one combo price, which is lower than buying the items separately; each combo page shows how much you save. " +
      "Some items let you choose an alternative product or a colour at the same combo price. " +
      "Customers can also build their own combo at /products?mode=combo-builder.",
  });

  docs.push({
    id: "policy:payment",
    type: "policy",
    title: "Payment",
    text:
      "Payment options are shown at checkout; they include online payment through Paystack, bank transfer, and cash on delivery in selected cities. " +
      "Bank transfer details are shown at checkout.",
  });

  if (contact) {
    docs.push({
      id: "policy:contact",
      type: "policy",
      title: "Contact us",
      link: "/contact",
      text:
        [
          contact.phone ? `Phone: ${contact.phone}` : "",
          contact.whatsappNumber ? `WhatsApp: ${contact.whatsappNumber}` : "",
          contact.email ? `Email: ${contact.email}` : "",
          contact.address ? `Address: ${contact.address}` : "",
        ]
          .filter(Boolean)
          .join(". ") || "Use the chat to reach the team.",
    });
  }

  // ---- Categories, with the combos inside each ----
  for (const cat of categories as any[]) {
    const inside = (combos as any[]).filter((c) => (c.categorySlugs ?? []).includes(cat.slug));
    docs.push({
      id: `category:${cat.slug}`,
      type: "policy",
      title: cut(cat.name, 60),
      link: `/categories/${cat.slug}`,
      text: cut(
        `${cat.description ? cat.description + ". " : ""}Category "${cat.name}". ` +
          (inside.length
            ? `Combos in it: ${inside
                .slice(0, 12)
                .map((c) => `${cut(c.name, 50)} ${naira(c.totalPrice)} (${(c.stockLeft ?? 0) > 0 ? "in stock" : "out of stock"})`)
                .join("; ")}.`
            : "No combos in this category right now."),
        900,
      ),
    });
  }

  // ---- Store overview (so "what do you sell?" gets a real answer) ----
  {
    const list = combos as any[];
    const available = list.filter((c) => (c.stockLeft ?? 0) > 0);
    const prices = available.map((c) => c.totalPrice).filter((n) => typeof n === "number");
    docs.push({
      id: "policy:overview",
      type: "policy",
      title: "About Smart Combo and what we sell",
      link: "/products",
      text:
        "Smart Combo is an online store in Nigeria that sells combos: handpicked bundles of products at one lower price. " +
        `Right now there are ${list.length} combos listed, ${available.length} in stock` +
        (prices.length ? `, from ${naira(Math.min(...prices))} to ${naira(Math.max(...prices))}` : "") +
        "." +
        ((categories as any[]).length
          ? ` Categories: ${(categories as any[]).map((c) => cut(c.name, 40)).join(", ")}.`
          : "") +
        " Customers can also build their own combo, win a free gift as they spend, and become partners to earn commission.",
    });
  }

  // ---- Ordering and tracking (from how checkout and orders really work) ----
  docs.push({
    id: "order:how",
    type: "policy",
    title: "How to place an order",
    link: "/products",
    text:
      "Add a combo to your cart (or build your own combo), open the cart and go to checkout. " +
      "Enter your full name, phone number, email, state, city and street address (landmark is optional), choose a payment method and place the order. " +
      "You get an email when your order is received. The AI assistant can't place orders or take payments; use the website checkout.",
  });
  docs.push({
    id: "order:tracking",
    type: "policy",
    title: "How to track an order",
    link: "/order-tracking",
    text:
      "Open Track Order on the website and enter your order number (it looks like SC-2026-000123) and the phone number you used at checkout. " +
      "Customers are also emailed when the order is received, payment is confirmed, it ships (with a tracking number when available) and when it is delivered.",
  });
  docs.push({
    id: "order:status",
    type: "policy",
    title: "What the order statuses mean",
    link: "/order-tracking",
    text:
      "Pending: order received, waiting for payment. Paid: payment confirmed. Processing: being prepared (cash-on-delivery orders start here). " +
      "Shipped: on its way. Delivered: arrived. Cancelled or refunded: the order was stopped or the money returned.",
  });

  // ---- Partner program: rates come live from the admin settings ----
  {
    const combo = program?.comboPercent ?? 5;
    const single = program?.singlePercent ?? 10;
    const hold = program?.holdDays ?? 7;
    const min = program?.minWithdrawal ?? 2000;
    docs.push({
      id: "partner:overview",
      type: "policy",
      title: "Smart Combo partner program",
      link: "/#reseller",
      text:
        "Anyone can apply to become a Smart Combo partner (reseller) and earn commission by sharing their own link. " +
        "It is free to join and partners don't buy or hold stock. The team reviews and approves each application. " +
        "Approved partners get a personal partner code (like SC1001) and link, and log in on the Partner page.",
    });
    docs.push({
      id: "partner:signup",
      type: "policy",
      title: "How to sign up as a partner",
      link: "/#reseller",
      text:
        "Click Become a partner and fill the form: full name, phone number, WhatsApp number, email, a password (at least 8 characters) and bank details for payouts (bank name, 10-digit account number, account name). " +
        "You can also say which social channel you will promote on. New applications start as pending and you get a confirmation email, then another email when you are approved. " +
        "You can't log in or get a link until approved. An email address or phone number can only be used for one partner account.",
    });
    docs.push({
      id: "partner:earnings",
      type: "policy",
      title: "How much partners earn",
      link: "/#reseller",
      text:
        `Partners earn ${combo}% commission on every combo sold through their link and ${single}% on every single product. ` +
        "A combo is a bundle of two or more items; a single product is one item. The percentage is worked out on the product price only, not the delivery fee. " +
        `Example: someone buys a ${naira(40000)} combo with your link and you earn ${naira(Math.round((40000 * combo) / 100))}. ` +
        "Free gifts earn nothing, cancelled or refunded orders earn nothing, and partners can't earn from their own purchases.",
    });
    docs.push({
      id: "partner:payout",
      type: "policy",
      title: "How and when partners get paid",
      link: "/partner",
      text:
        "Commission counts once the customer's order is delivered. A partner's first delivered sale starts a " +
        `${hold}-day week; when the week ends, everything delivered so far can be withdrawn together. ` +
        `The partner then requests a withdrawal from the dashboard. The smallest withdrawal is ${naira(min)}, it is paid to the bank account given at sign-up, ` +
        "and only one withdrawal request can be open at a time. Payouts are made on Fridays.",
    });
    docs.push({
      id: "partner:dashboard",
      type: "policy",
      title: "Partner dashboard and marketing material",
      link: "/partner",
      text:
        "Partners log in on the Partner page with their email and password. The dashboard shows their link, clicks, orders, conversion rate and earnings split into pending, approved, paid and cancelled. " +
        "Approved partners also get ready-made pictures, videos and captions for WhatsApp, Instagram and TikTok, with their own link filled in. " +
        "To change bank details, contact support.",
    });
  }

  // ---- Page text: shipping, returns, privacy, terms, contact (built by build-site-knowledge.mjs) ----
  for (const page of siteContent as { id: string; title: string; link?: string; text: string }[]) {
    chunk(page.text, 800).forEach((part, i, all) => {
      docs.push({
        id: `site:${page.id}:${i + 1}`,
        type: "policy",
        title: all.length > 1 ? `${page.title} (part ${i + 1})` : page.title,
        link: page.link,
        text: part,
      });
    });
  }

  cache = { at: Date.now(), docs };
  return docs;
}
