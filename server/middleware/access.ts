/**
 * SC-STAFF SC-STAFF3  accessGuard: runs after requireAuth on every /api/admin request.
 *  - Owner: everything allowed.
 *  - Staff: allowed only what their role lists (see permissions.ts); otherwise 403.
 *  - Staff requests and responses are scrubbed of cost and profit fields.
 *  - Every successful change (POST/PATCH/PUT/DELETE) is written to the audit log.
 */
import { Request, Response, NextFunction } from "express";
import { requiredFor, SECRET_KEYS } from "../permissions";
import { AuditLog } from "../models/AuditLog";

function scrub(value: any): any {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.has(k.toLowerCase())) continue;
      out[k] = scrub(v);
    }
    return out;
  }
  return value;
}

export function accessGuard(req: Request, res: Response, next: NextFunction): void | Response {
  const u = (req as any).user;
  if (!u) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please log in" } });
  }
  const perms: string[] = u.permissions || [];
  const isOwner = perms.includes("*");

  if (!isOwner) {
    const need = requiredFor(req.method, req.path);
    if (!need || !need.some((n) => perms.includes(n))) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You do not have access to this." },
      });
    }
    if (req.body && typeof req.body === "object") req.body = scrub(req.body);
    // Staff can record a sale but never confirm payment: it is saved as awaiting payment and the owner marks it paid.
    if (req.method === "POST" && /^\/orders\/manual\/?$/.test(req.path) && req.body && typeof req.body === "object") {
      req.body.paid = false;
    }
    const original = res.json.bind(res);
    res.json = ((body?: any) => {
      try { return original(scrub(JSON.parse(JSON.stringify(body ?? null)))); }
      catch { return original(body); }
    }) as any;
  }

  // Remember which order / product / person this change was about, for the activity log
  let detail = "";
  const prevJson = res.json.bind(res);
  res.json = ((body?: any) => {
    try {
      const d = body?.data;
      detail = String(d?.orderNumber || d?.comboName || d?.name || "").slice(0, 120);
    } catch { /* ignore */ }
    return prevJson(body);
  }) as any;

  const m = req.method.toUpperCase();
  if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") {
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      AuditLog.create({
        userId: u.userId, name: u.name, email: u.email,
        role: isOwner ? "owner" : u.staffRole || "staff",
        method: m, path: req.baseUrl + req.path, status: res.statusCode, ip: req.ip, detail,
      }).catch((e) => console.error("[audit] write failed:", e));
    });
  }
  next();
}
