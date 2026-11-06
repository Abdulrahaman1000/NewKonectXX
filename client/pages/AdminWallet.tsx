/** SC-WAL  Admin: what customers hold in wallets, history, and a tool to add referral earnings, bonuses or corrections. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminWalletAdjust, adminWalletHistory, adminWallets } from '@/api/wallet';

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
const KINDS = [{ v: 'referral', t: 'Referral earnings' }, { v: 'bonus', t: 'Bonus' }, { v: 'adjust', t: 'Correction (can be negative)' }] as const;

export default function AdminWallet() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'referral' | 'bonus' | 'adjust'>('referral');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const s = useQuery({ queryKey: ['admin-wallets', q], queryFn: () => adminWallets(q), retry: false });
  const h = useQuery({ queryKey: ['admin-wallet-h', open], queryFn: () => adminWalletHistory(open), enabled: !!open, retry: false });

  const submit = async () => {
    setMsg(null); setBusy(true);
    try {
      const r = await adminWalletAdjust({ email: email.trim(), amount: Number(amount), kind, note });
      setMsg({ ok: true, text: `Done. New balance ${naira(r.balance)}.` }); setAmount(''); setNote('');
      qc.invalidateQueries({ queryKey: ['admin-wallets'] }); qc.invalidateQueries({ queryKey: ['admin-wallet-h'] });
    } catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  };
  const inp = 'w-full rounded-lg border border-white/15 bg-black/30 px-3 min-h-[44px] text-white outline-none focus:border-primary';

  return (
    <AdminFrame>
      <SEO title="Wallets | Admin" description="Customer wallets" />
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4"><ArrowLeft className="w-3 h-3" /> Dashboard</Link>
      <h1 className="text-2xl font-black">Customer wallets</h1>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[['Owed to customers', s.data ? naira(s.data.totalOwed) : '…'], ['Wallets', s.data?.wallets ?? '…'], ['With money', s.data?.withBalance ?? '…']].map(([a, b]) => (
          <div key={String(a)} className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-white/60">{a}</p><p className="text-lg font-black tabular-nums text-primary">{b}</p></div>
        ))}
      </div>
      <p className="text-xs text-white/50 mt-2">Keep at least this much in your Paystack balance or bank. It is money customers can still spend.</p>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-black">Add or correct a balance</h2>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <label className="text-sm">Customer email<input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" /></label>
          <label className="text-sm">Amount (₦)<input className={inp} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ''))} /></label>
          <label className="text-sm">Type<select className={inp} value={kind} onChange={(e) => setKind(e.target.value as any)}>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.t}</option>)}</select></label>
          <label className="text-sm">Note (optional)<input className={inp} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <p className="text-xs text-white/50 mt-2">“Referral earnings” shows to the customer with that name in their wallet history.</p>
        {msg && <p role="status" className={`text-sm mt-2 ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</p>}
        <button type="button" disabled={busy || !email || !amount} onClick={submit} className="mt-3 min-h-[44px] px-5 rounded-lg bg-primary text-black font-black disabled:opacity-40">{busy ? 'Saving…' : 'Save'}</button>
      </section>

      <section className="mt-6">
        <input className={inp} placeholder="Search by email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search wallets" />
        <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          {(s.data?.list ?? []).map((r) => (
            <li key={r.customerId}>
              <button type="button" onClick={() => setOpen(open === r.customerId ? '' : r.customerId)} className="w-full flex justify-between gap-3 px-4 min-h-[48px] items-center text-left">
                <span className="truncate text-sm">{r.email || r.customerId}</span><span className="font-black tabular-nums">{naira(r.balance)}</span>
              </button>
              {open === r.customerId && (
                <ul className="px-4 pb-3 text-sm text-white/75 space-y-1">
                  {(h.data?.history ?? []).slice(0, 30).map((e) => <li key={e.ref} className="flex justify-between gap-3"><span className="truncate">{e.kind} · {e.note}</span><span className="tabular-nums">{e.amount > 0 ? '+' : '−'}{naira(Math.abs(e.amount))}</span></li>)}
                  {h.isLoading && <li>Loading…</li>}
                </ul>
              )}
            </li>
          ))}
          {s.data && s.data.list.length === 0 && <li className="px-4 py-4 text-sm text-white/50">No wallets yet.</li>}
        </ul>
      </section>
    </AdminFrame>
  );
}
