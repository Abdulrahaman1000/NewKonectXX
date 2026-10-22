/** Today at a glance: sales, profit, what needs doing, and the morning email. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { getSummary, sendSummaryNow } from '@/api/adminSummary';
import { formatNaira } from '@/lib/format';

export default function AdminToday() {
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const { data: s, isLoading, error } = useQuery({ queryKey: ['admin-summary', day], queryFn: () => getSummary(day), refetchInterval: 60000 });
  const send = useMutation({
    mutationFn: () => sendSummaryNow(day),
    onSuccess: (r) => toast.success(`Sent to ${r.data.to ?? 'your email'}`),
    onError: (e: any) => toast.error(e?.message || 'Could not send'),
  });

  return (
    <AdminFrame>
      <SEO title="Today" />
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-1">{day === 'today' ? 'Today' : 'Yesterday'}</h1>
          <p className="text-sm text-white/45">{s?.date}{s ? ` · the same summary is emailed to you every morning at ${s.sendHour}:00 on the live site` : ''}</p>
        </div>
        <button type="button" onClick={() => send.mutate()} disabled={send.isPending}
          className="px-4 py-2 rounded-lg border border-white/15 text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2 disabled:opacity-50">
          {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Email me this now
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['today', 'yesterday'] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDay(d)}
            className={`px-4 py-2 rounded-full text-xs font-bold border capitalize ${day === d ? 'bg-primary text-black border-primary' : 'border-white/15 text-white/70 hover:bg-white/5'}`}>{d}</button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-white/45 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}
      {error && <p className="text-sm text-red-300">Could not load the summary.</p>}

      {s && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Stat label="Orders" value={String(s.orders)} sub={s.manualOrders ? `${s.manualOrders} recorded by hand` : undefined} />
            <Stat label="Revenue" value={formatNaira(s.revenue)} />
            <Stat label="Profit" value={s.profit === null ? 'No cost prices yet' : formatNaira(s.profit)} sub={s.profit === null ? undefined : `${s.profitCoverage.costed} of ${s.profitCoverage.total} orders costed`} small={s.profit === null} />
            <Stat label="Expenses" value={formatNaira(s.expenses)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Needs your attention">
              <ul className="space-y-2 text-sm">
                <Row to="/admin/fulfilment" label="Orders waiting to be packed" value={String(s.toPack)} hot={s.toPack > 0} note={s.oldestToPackHours >= 24 ? `oldest ${Math.floor(s.oldestToPackHours / 24)}d` : undefined} />
                <Row to="/admin/orders" label="Unpaid orders pending" value={String(s.unpaid)} hot={s.unpaid > 0} />
                <Row to="/admin/payouts" label="Owed to partners (ready to pay)" value={formatNaira(s.commissionOwed)} hot={s.commissionOwed > 0} />
                <Row to="/admin/payouts" label="Partner commission still on hold" value={formatNaira(s.commissionPending)} />
              </ul>
            </Card>
            <Card title="Best sellers">
              {s.bestSellers.length === 0 ? <p className="text-sm text-white/45">No sales in this period yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {s.bestSellers.map((b) => <li key={b.name} className="flex justify-between"><span className="text-white/80">{b.name}</span><b className="text-primary">{b.units} sold</b></li>)}
                </ul>
              )}
            </Card>
            <Card title="Stock running low" link={{ to: '/admin/stock', label: 'Open stock' }}>
              {s.lowStock.length === 0 ? <p className="text-sm text-emerald-300">Nothing is running low.</p> : (
                <ul className="space-y-2 text-sm">
                  {s.lowStock.map((c) => (
                    <li key={c.name} className="flex justify-between"><span className="text-white/80">{c.name}</span>
                      <b className={c.stockLeft <= 0 ? 'text-red-300' : 'text-amber-300'}>{c.stockLeft <= 0 ? 'Out' : `${c.stockLeft} left`}</b></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </AdminFrame>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-2xl'} font-black text-white mt-1 tabular-nums`}>{value}</p>
      {sub && <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}
function Card({ title, children, link }: { title: string; children: React.ReactNode; link?: { to: string; label: string } }) {
  return (
    <section className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-white">{title}</h2>
        {link && <Link to={link.to} className="text-[11px] text-primary hover:underline">{link.label}</Link>}
      </div>
      {children}
    </section>
  );
}
function Row({ to, label, value, hot, note }: { to: string; label: string; value: string; hot?: boolean; note?: string }) {
  return (
    <li><Link to={to} className="flex justify-between items-center hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2">
      <span className="text-white/70">{label}{note && <span className="text-white/35"> · {note}</span>}</span>
      <b className={hot ? 'text-primary' : 'text-white/60'}>{value}</b>
    </Link></li>
  );
}
