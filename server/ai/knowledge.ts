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
import { GIFT_THRESHOLD, GIFT_WINDOW_DAYS } from "../services/giftProgress";
import { thumb, type ImgDoc } from "./cards";

const TTL_MS = 60_000;
let cache: { at: number; docs: ImgDoc[] } | null = null;

const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const cut = (s: unknown, max = 500) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function getKnowledge(): Promise<ImgDoc[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.docs;

  const [combos, gifts, faqs, settings] = await Promise.all([
    Combo.find({ isActive: true }).sort({ isFeatured: -1, createdAt: -1 }).limit(60).lean(),
    Gift.find({ isActive: { $ne: false }, stock: { $gt: 0 } }).limit(30).lean(),
    FAQ.find({ isPublished: true }).sort({ order: 1 }).limit(40).lean(),
    SiteSettings.findOne().lean(),
  ]);

  const docs: ImgDoc[] = [];

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

    // Photo: the combo's hero image, else the first photo of its first item
    const photo = thumb(c.heroImage) ?? thumb(c.items?.[0]?.images?.[0]?.url);

    docs.push({
      id: `combo:${c.slug}`,
      type: "combo",
      title: cut(c.name, 80),
      price: c.totalPrice,
      inStock,
      link: `/combos/${c.slug}`,
      image: photo ?? undefined,
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

  cache = { at: Date.now(), docs };
  return docs;
}
