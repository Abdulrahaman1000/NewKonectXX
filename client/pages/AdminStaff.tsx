/** SC-STAFF  /admin/staff — create staff, set role, disable, reset password. Owner only. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { SEO } from "@/components/shared/SEO";
import {
  listStaff, createStaff, updateStaff, resetStaffPassword,
  STAFF_ROLE_LABELS, type StaffRole,
} from "@/api/adminStaff";

const ROLES = Object.keys(STAFF_ROLE_LABELS) as StaffRole[];
const input = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50";

export default function AdminStaff() {
  const qc = useQueryClient();
  const { data: staff = [], isLoading } = useQuery({ queryKey: ["admin-staff"], queryFn: listStaff });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("packer");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-staff"] });
  const fail = (e: any) => setMsg({ ok: false, text: e?.message || "Something went wrong" });

  async function onCreate() {
    setBusy(true); setMsg(null);
    try {
      await createStaff({ name, email, staffRole, password });
      setMsg({ ok: true, text: `Account created for ${name}. Give them the email and password privately.` });
      setName(""); setEmail(""); setPassword("");
      refresh();
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function change(id: string, body: Parameters<typeof updateStaff>[1]) {
    setMsg(null);
    try { await updateStaff(id, body); refresh(); } catch (e) { fail(e); }
  }

  async function reset(id: string, who: string) {
    const pw = window.prompt(`New password for ${who} (at least 8 characters):`);
    if (!pw) return;
    try { await resetStaffPassword(id, pw); setMsg({ ok: true, text: `Password changed for ${who}.` }); }
    catch (e) { fail(e); }
  }

  return (
    <AdminFrame>
      <SEO title="Staff" />
      <Link to="/admin" className="text-xs text-white/50 hover:text-white/80">← Dashboard</Link>
      <h1 className="text-2xl font-black text-white mt-2 mb-1">Staff accounts</h1>
      <p className="text-sm text-white/45 mb-6">
        Each person gets their own login and only sees the pages for their role. They never see costs or profit.
      </p>

      {msg && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${msg.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 p-5 mb-8" style={{ background: "rgba(255,255,255,0.02)" }}>
        <h2 className="text-sm font-bold text-white mb-3">Add a staff member</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} placeholder="Email (their login)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className={input} value={staffRole} onChange={(e) => setStaffRole(e.target.value as StaffRole)}>
            {ROLES.map((r) => <option key={r} value={r} className="text-black">{STAFF_ROLE_LABELS[r]}</option>)}
          </select>
          <input className={input} type="text" placeholder="Starting password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button
          type="button" disabled={busy} onClick={onCreate}
          className="mt-4 px-4 py-2 rounded-lg bg-primary text-black text-sm font-bold disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </div>

      <h2 className="text-sm font-bold text-white mb-3">Your team</h2>
      {isLoading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : staff.length === 0 ? (
        <p className="text-sm text-white/40">No staff yet.</p>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div key={s.id} className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center gap-3 ${s.active ? "border-white/10" : "border-red-500/20 opacity-70"}`} style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {s.name} {!s.active && <span className="ml-2 text-[10px] uppercase text-red-300">Disabled</span>}
                </p>
                <p className="text-xs text-white/50 truncate">{s.email}</p>
                <p className="text-[11px] text-white/30">
                  {s.lastLoginAt ? `Last login ${new Date(s.lastLoginAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}` : "Never logged in"}
                </p>
              </div>
              <select
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
                value={s.staffRole} onChange={(e) => change(s.id, { staffRole: e.target.value as StaffRole })}
              >
                {ROLES.map((r) => <option key={r} value={r} className="text-black">{STAFF_ROLE_LABELS[r]}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => reset(s.id, s.name)} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/70 hover:border-primary/40">
                  Reset password
                </button>
                <button type="button" onClick={() => change(s.id, { active: !s.active })} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/70 hover:border-red-500/40 hover:text-red-300">
                  {s.active ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminFrame>
  );
}
