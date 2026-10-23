/**
 * SC-STAFF SC-STAFF2  Permissions: the single source of truth for what each role may do.
 * The server sends each user's permission list to the browser, so the menu
 * and the server can never disagree.
 */
export type StaffRole = "packer" | "sales" | "content" | "bookkeeper" | "manager";
export const STAFF_ROLES: StaffRole[] = ["packer", "sales", "content", "bookkeeper", "manager"];
export const ROLE_LABELS: Record<StaffRole, string> = {
  packer: "Packer / dispatch",
  sales: "Sales assistant (WhatsApp)",
  content: "Content / marketing",
  bookkeeper: "Bookkeeper",
  manager: "Manager",
};

const PACKER = ["fulfilment.use", "stock.use"];
const SALES = ["sale.record", "orders.view", "chats.use", "faqs.use"];
const CONTENT = ["products.edit", "slides.use", "testimonials.use", "ads.use"];
const BOOKKEEPER = ["expenses.use", "reports.view"]; // pages for these come later

export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  packer: PACKER,
  sales: SALES,
  content: CONTENT,
  bookkeeper: BOOKKEEPER,
  manager: [...PACKER, ...SALES, ...CONTENT, "partners.approve"],
};

export function isOwnerRole(role?: string): boolean {
  return role === "superadmin" || role === "admin";
}

export function permissionsFor(u: { role?: string; staffRole?: string; active?: boolean }): string[] {
  if (u.active === false) return [];
  if (isOwnerRole(u.role)) return ["*"];
  return ROLE_PERMISSIONS[u.staffRole as StaffRole] ?? [];
}

/** Fields only the owner may ever see or send. Removed from staff requests and responses. */
export const SECRET_KEYS = new Set(
  ["costPrice", "unitCost", "totalCost", "costOfGoods", "cogs", "cost", "costs",
   "profit", "netProfit", "grossProfit", "margin", "profitMargin"].map((k) => k.toLowerCase()),
);

/**
 * Which permission(s) a staff member needs for a request. Any one is enough.
 * null = owner only. Anything not listed here is owner only (fail closed).
 * `path` is relative to /api/admin, e.g. "/orders/123".
 */
export function requiredFor(method: string, path: string): string[] | null {
  const m = method.toUpperCase();
  const read = m === "GET" || m === "HEAD";
  const p = path.toLowerCase();
  if (/profit|cost/.test(p)) return null;
  const seg = p.split("/")[1] || "";
  switch (seg) {
    case "fulfilment": return ["fulfilment.use"];
    case "stock": return ["stock.use"];
    case "dashboard": return ["orders.view"];
    case "orders":
      if (read) return ["orders.view"];
      // money-moving actions stay with the owner; recording a sale is allowed
      if (/cancel|refund|paid|status|delete|ship|deliver|payment/.test(p)) return null;
      return ["sale.record"];
    case "combos":
      if (read) return ["products.edit", "sale.record", "stock.use"];
      if (m === "DELETE") return null;
      return ["products.edit"];
    case "categories": return read ? ["products.edit", "sale.record"] : ["products.edit"];
    case "hero-slides": return ["slides.use"];
    case "testimonials": return ["testimonials.use"];
    case "ads": return ["ads.use"];
    case "faqs": return ["faqs.use"];
    case "chats": return ["chats.use"];
    case "bookkeeping":
      // expenses (and the expenses export) need expenses.use; sales reports and exports need reports.view
      return p.includes("expenses") ? ["expenses.use"] : ["reports.view"];
    default: return null;
  }
}
