/** SC-STAFF SC-STAFF3  /admin/audit — who changed what. Owner only. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { SEO } from "@/components/shared/SEO";
import { listAudit, listStaff } from "@/api/adminStaff";
import { describeAction } from "@/lib/auditText";

export default function AdminAudit() {
  const [userId, setUserId] = useState("");
  const { data: staff = [] } = useQuery({ queryKey: ["admin-staff"], queryFn: listStaff });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-audit", userId],
    queryFn: () => listAudit(userId || undefined),
  });

  return (
    <AdminFrame>
      <SEO title="Activity log" />
      <Link to="/admin" className="text-xs text-white/50 hover:text-white/80">← Dashboard</Link>
      <h1 className="text-2xl font-black text-white mt-2 mb-1">Activity log</h1>
      <p className="text-sm text-white/45 mb-4">Every change made in the admin: who, what and when. Kept for one year.</p>

      <select
        className="mb-5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        value={userId} onChange={(e) => setUserId(e.target.value)}
      >
        <option value="" className="text-black">Everyone</option>
        {staff.map((s) => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}
      </select>

      {isLoading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/40">Nothing recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r._id} className="rounded-xl border border-white/10 px-4 py-3 text-sm" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold text-white">{r.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-primary/80">{r.role}</span>
                <span className="text-xs text-white/30 ml-auto">
                  {new Date(r.createdAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
                </span>
              </div>
              <p className="text-sm text-white/80">
                {describeAction(r.method, r.path)}
                {r.detail ? <span className="text-primary"> · {r.detail}</span> : null}
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminFrame>
  );
}
