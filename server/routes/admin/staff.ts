/** SC-STAFF  Staff accounts. Owner only (enforced by accessGuard: not listed = owner only). */
import { Router, Request, Response } from "express";
import { AdminUser, hashPassword } from "../../models/AdminUser";
import { STAFF_ROLES } from "../../permissions";

const router = Router();
const shape = (u: any) => ({
  id: String(u._id), name: u.name, email: u.email, staffRole: u.staffRole,
  active: u.active !== false, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
});
const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ error: { code: "BAD_REQUEST", message } });

router.get("/", async (_req: Request, res: Response) => {
  const list = await AdminUser.find({ role: "staff" }).sort({ createdAt: -1 }).lean();
  res.json({ data: list.map(shape) });
});

router.post("/", async (req: Request, res: Response) => {
  const { name, email, staffRole, password } = req.body || {};
  if (!name || !String(name).trim()) return bad(res, "Name is required");
  if (!email || !/^\S+@\S+\.\S+$/.test(String(email))) return bad(res, "A valid email is required");
  if (!STAFF_ROLES.includes(staffRole)) return bad(res, "Pick a role");
  if (!password || String(password).length < 8) return bad(res, "Password must be at least 8 characters");
  const exists = await AdminUser.findOne({ email: String(email).toLowerCase() });
  if (exists) return bad(res, "That email already has an account", 409);
  const u = await AdminUser.create({
    name: String(name).trim(), email: String(email).toLowerCase().trim(),
    passwordHash: await hashPassword(String(password)), role: "staff", staffRole, active: true,
  });
  res.status(201).json({ data: shape(u) });
});

router.patch("/:id", async (req: Request, res: Response) => {
  const u = await AdminUser.findOne({ _id: req.params.id, role: "staff" });
  if (!u) return bad(res, "Staff member not found", 404);
  const { name, staffRole, active } = req.body || {};
  if (typeof name === "string" && name.trim()) u.name = name.trim();
  if (staffRole !== undefined) {
    if (!STAFF_ROLES.includes(staffRole)) return bad(res, "Unknown role");
    u.staffRole = staffRole;
  }
  if (typeof active === "boolean") u.active = active;
  await u.save();
  res.json({ data: shape(u) });
});

router.post("/:id/password", async (req: Request, res: Response) => {
  const u = await AdminUser.findOne({ _id: req.params.id, role: "staff" });
  if (!u) return bad(res, "Staff member not found", 404);
  const { password } = req.body || {};
  if (!password || String(password).length < 8) return bad(res, "Password must be at least 8 characters");
  u.passwordHash = await hashPassword(String(password));
  await u.save();
  res.json({ data: { ok: true } });
});

export default router;
