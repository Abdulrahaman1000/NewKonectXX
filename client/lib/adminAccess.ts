/** SC-STAFF SC-STAFF2  Which permission each admin page needs. null = any signed-in person. Unknown = owner only. */
const MAP: [string, string | null][] = [
  ["/admin/orders", "orders.view"],
  ["/admin/record-sale", "sale.record"],
  ["/admin/fulfilment", "fulfilment.use"],
  ["/admin/stock", "stock.use"],
  ["/admin/combos", "products.edit"],
  ["/admin/categories", "products.edit"],
  ["/admin/hero-slides", "slides.use"],
  ["/admin/testimonials", "testimonials.use"],
  ["/admin/ads", "ads.use"],
  ["/admin/faqs", "faqs.use"],
  ["/admin/chats", "chats.use"],
  ["/admin/expenses", "expenses.use"],
  ["/admin/reports", "reports.view"],
];

export function permForPath(path: string): string | null {
  if (path === "/admin") return null;
  for (const [prefix, perm] of MAP) {
    if (path === prefix || path.startsWith(prefix + "/")) return perm;
  }
  return "owner"; // profit, today, payouts, partners, settings, gift bank, staff, audit...
}
