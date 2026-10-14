/**
 * Admin partner sales — /admin/partners/:id  (Destination: client/pages/AdminPartnerSales.tsx)
 * Everything one partner has sold, so you can check it before paying.
 * Open from the Partners page, or from a payout request ("View sales"): with ?withdrawal=<id>
 * the orders that belong to that request are highlighted.
 */
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import { COMMISSION_STATUS_LABEL, COMMISSION_STATUS_STYLE, getPartnerSales } from '@/api/adminCommissions';

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;
const day = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-0.5 text-lg font-black text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/35">{sub}</p>}
    </div>
  );
}

export default function AdminPartnerSales() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const highlight = params.get('withdrawal');
  const q = useQuery({ queryKey: ['admin-partner-sales', id], queryFn: () => getPartnerSales(id) });

  return (
    <AdminFrame>
      <SEO title="Partner sales — Admin" />
      <Link to={highlight ? '/admin/payouts' : '/admin/resellers'} className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> {highlight ? 'Payouts' : 'Partners'}
      </Link>

      {q.isLoading && <Loader2 className="w-5 h-5 animate-spin text-white/50" />}
      {q.isError && <p className="text-sm text-red-300">Could not load this partner.</p>}

      {q.data && (() => {
        const d = q.data;
        return (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">{d.partner.fullName}</h1>
              {d.partner.resellerCode && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30">{d.partner.resellerCode}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-white/40">{d.partner.status}</span>
            </div>
            <p className="text-xs text-white/40 mt-1">
              {d.partner.phone} · {d.partner.email}
              {d.partner.bankName && ` · ${d.partner.bankName} ${d.partner.accountNumber} (${d.partner.accountName})`}
            </p>

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile label="Clicks" value={String(d.stats.clicks)} />
              <Tile label="Orders" value={String(d.stats.orders)} />
              <Tile label="Pending" value={naira(d.totals.pending)} sub="not yet released" />
              <Tile label="Approved" value={naira(d.totals.approved)} sub={d.requested ? `${naira(d.requested)} already requested` : 'ready to withdraw'} />
              <Tile label="Paid" value={naira(d.totals.paid)} />
              <Tile label="Cancelled" value={naira(d.totals.cancelled)} sub="never paid" />
            </div>
            {d.cycle && (
              <p className="mt-3 text-xs text-white/50">
                Payout week started {day(d.cycle.startedAt)}; opens {day(d.cycle.releaseAt)}.
              </p>
            )}

            <h2 className="mt-8 mb-2 text-sm font-bold text-white">Referred orders</h2>
            {d.rows.length === 0 ? (
              <p className="text-sm text-white/40">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="text-white/40 border-b border-white/10">
                    <tr>
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Order status</th>
                      <th className="px-3 py-2 text-right">Products</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Commission</th>
                      <th className="px-3 py-2">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((r) => {
                      const inRequest = !!highlight && r.withdrawalId === highlight;
                      return (
                        <tr key={r.orderId} className={`border-b border-white/5 ${inRequest ? 'bg-primary/10' : ''}`}>
                          <td className="px-3 py-2">
                            <Link to={`/admin/orders/${r.orderId}`} className="font-bold text-primary">{r.orderNumber}</Link>
                            <div className="text-[10px] text-white/35">{day(r.date)}</div>
                          </td>
                          <td className="px-3 py-2 text-white/70">{r.customer || '—'}</td>
                          <td className="px-3 py-2">
                            <span className="capitalize text-white/70">{r.orderStatus}</span>
                            {r.deliveredAt && <div className="text-[10px] text-white/35">delivered {day(r.deliveredAt)}</div>}
                          </td>
                          <td className="px-3 py-2 text-right text-white/70">{naira(r.base)}</td>
                          <td className="px-3 py-2 text-right text-white/50">{r.rate}%</td>
                          <td className="px-3 py-2 text-right font-bold text-white">{naira(r.amount)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] ${COMMISSION_STATUS_STYLE[r.status]}`}>{COMMISSION_STATUS_LABEL[r.status]}</span>
                            {inRequest && <div className="text-[10px] text-primary mt-0.5">in this request</div>}
                            {!inRequest && r.withdrawalId && r.status !== 'paid' && <div className="text-[10px] text-white/35 mt-0.5">in a request</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <h2 className="mt-8 mb-2 text-sm font-bold text-white">Withdrawals</h2>
            {d.withdrawals.length === 0 ? (
              <p className="text-sm text-white/40">No withdrawals yet.</p>
            ) : (
              <div className="divide-y divide-white/10 rounded-xl border border-white/10">
                {d.withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 text-xs">
                    <span className="text-white/70">{day(w.paidAt ?? w.date)} · {w.orderCount} order{w.orderCount === 1 ? '' : 's'}{w.note ? ` · ${w.note}` : ''}</span>
                    <span className="font-bold text-white">{naira(w.amount)} <span className="ml-1 text-white/40 capitalize">{w.status === 'rejected' ? 'declined' : w.status}</span></span>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}
    </AdminFrame>
  );
}
