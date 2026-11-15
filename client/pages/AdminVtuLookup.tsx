/** SC-SUPPORT  Find a purchase (customer support). Read only: no cost, profit or buttons that change anything. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { apiFetch } from '@/api/client';

interface Found { reference: string; createdAt: string; service: string; network: string; planName: string; amount: number; quantity: number; email: string; phone: string; meterNumber: string; cardNumber: string; payMethod: string; paymentStatus: string; fulfilmentStatus: string; refundStatus: string; token: string; units: string; pinsDelivered: number }
const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

/** What the support person can say to the customer. */
function say(o: Found): { text: string; tone: string } {
  if (o.refundStatus === 'refunded') return { text: 'Delivery failed and the customer has been refunded.', tone: 'text-sky-300' };
  if (o.refundStatus !== 'not_required') return { text: 'Delivery failed. The refund is being handled by the owner. Tell the customer it will be returned.', tone: 'text-amber-300' };
  if (o.paymentStatus === 'pending') return { text: 'Payment was never confirmed, so nothing was bought. If the customer says money left their bank, ask for the bank receipt and tell the owner.', tone: 'text-amber-300' };
  if (o.paymentStatus === 'mismatch') return { text: 'The payment amount did not match. Pass this to the owner.', tone: 'text-amber-300' };
  if (o.paymentStatus === 'failed') return { text: 'The payment failed. Nothing was charged here.', tone: 'text-white/70' };
  if (o.fulfilmentStatus === 'successful') return { text: 'Delivered. If the customer says they did not get it, ask them to check the number and wait a few minutes, then pass this to the owner.', tone: 'text-emerald-300' };
  return { text: 'Paid and still being delivered. Ask the customer to wait a few minutes. If it is still not done, pass the reference to the owner.', tone: 'text-amber-300' };
}

export default function AdminVtuLookup() {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const res = useQuery({ queryKey: ['vtu-lookup', q], queryFn: () => apiFetch<{ orders: Found[] }>(`/api/admin/vtu-lookup?q=${encodeURIComponent(q)}`), enabled: q.length >= 3, retry: false });
  const rows = res.data?.orders ?? [];
  return (
    <AdminFrame>
      <SEO title="Find a purchase | Admin" description="Look up a customer purchase" />
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4"><ArrowLeft className="w-3 h-3" /> Dashboard</Link>
      <h1 className="text-2xl font-black text-white mb-1">Find a purchase</h1>
      <p className="text-xs text-white/50 mb-4">Ask the customer for the reference on their receipt (SC-VTU-...), or the phone number, meter or smartcard number, or their email.</p>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setQ(text.trim()); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reference, phone, meter, smartcard or email" aria-label="Search purchases" className="flex-1 min-h-[44px] rounded-xl bg-white/5 border border-white/15 px-3 text-sm text-white placeholder-white/35" />
        <button type="submit" className="min-h-[44px] px-4 rounded-xl bg-primary text-black text-sm font-black">Search</button>
      </form>
      {q.length > 0 && q.length < 3 && <p className="text-sm text-white/60">Type at least 3 characters.</p>}
      {res.isFetching && <p className="text-sm text-white/60 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching...</p>}
      {res.isError && <p className="text-sm text-red-300">Could not search. Try again.</p>}
      {q.length >= 3 && !res.isFetching && !res.isError && rows.length === 0 && <p className="text-sm text-white/60">Nothing found for "{q}". Check the spelling or try the phone number.</p>}
      <ul className="space-y-3">
        {rows.map((o) => {
          const s = say(o);
          return (
            <li key={o.reference} className="rounded-2xl border border-white/10 p-4 space-y-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex justify-between gap-2">
                <span className="text-sm font-black text-white">{o.service} &middot; {o.network} {o.service === 'electricity' ? '' : o.planName}{o.service === 'exam' && o.quantity > 1 ? ` x${o.quantity}` : ''}</span>
                <span className="text-sm font-black text-primary">{naira(o.amount)}</span>
              </div>
              <p className="text-xs text-white/60">{o.phone}{o.meterNumber ? ` meter ${o.meterNumber}` : ''}{o.cardNumber ? ` card ${o.cardNumber}` : ''} &middot; {o.email} &middot; {new Date(o.createdAt).toLocaleString('en-NG')}</p>
              <p className="text-xs text-white/70">Payment: <b>{o.paymentStatus}</b> ({o.payMethod}) &middot; Delivery: <b>{o.fulfilmentStatus}</b></p>
              {o.token && <p className="text-xs text-white/80">Token: <b className="select-all">{o.token}</b>{o.units ? ` (${o.units} units)` : ''}</p>}
              {o.pinsDelivered > 0 && <p className="text-xs text-white/60">{o.pinsDelivered} pin(s) were delivered to the customer's receipt page.</p>}
              <p className={`text-xs font-bold ${s.tone}`}>{s.text}</p>
              <p className="text-[10px] text-white/35 break-all select-all">{o.reference}</p>
            </li>
          );
        })}
      </ul>
    </AdminFrame>
  );
}
