/** SC-WAL  /wallet : balance, top-up, history. Referral earnings show here too. */
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Check, Gift, Loader2, Lock, Undo2, Wallet as WalletIcon } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { naira } from '@/components/vtu/brand';
import { setReturnTo } from '@/lib/customerSession';
import { checkFunding, fundWallet, getWallet, hasCustomerToken, type WalletEntry } from '@/api/wallet';

const QUICK = [1000, 2000, 5000, 10000];
const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-white/70';
const LABEL: Record<WalletEntry['kind'], string> = { fund: 'Wallet funded', spend: 'Paid for a purchase', refund: 'Refund', referral: 'Referral earnings', bonus: 'Bonus from Smart Combo', adjust: 'Adjustment by Smart Combo' };
const when = (d: string) => { try { return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };

function Row({ e }: { e: WalletEntry }) {
  const inn = e.amount > 0;
  const Icon = e.kind === 'referral' || e.kind === 'bonus' ? Gift : e.kind === 'refund' ? Undo2 : inn ? ArrowDownLeft : ArrowUpRight;
  const green = e.kind === 'referral' || e.kind === 'bonus';
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid place-items-center w-10 h-10 rounded-full shrink-0" style={{ background: green ? 'rgba(52,211,153,0.15)' : inn ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.08)' }}>
        <Icon className={`w-[18px] h-[18px] ${green ? 'text-emerald-300' : inn ? 'text-sky-300' : 'text-white/70'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[14px] font-bold leading-tight ${green ? 'text-emerald-300' : 'text-white'}`}>{LABEL[e.kind] ?? e.note}</span>
        <span className="block text-[12px] text-white/50 mt-0.5 break-words">{when(e.at)}{e.note && e.note !== LABEL[e.kind] ? ` · ${e.note}` : ''}</span>
      </span>
      <span className={`text-[15px] font-black tabular-nums ${inn ? 'text-emerald-300' : 'text-white'}`}>{inn ? '+' : '−'}{naira(Math.abs(e.amount))}</span>
    </li>
  );
}

export default function Wallet() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const signedIn = hasCustomerToken();
  const w = useQuery({ queryKey: ['wallet'], queryFn: getWallet, enabled: signedIn, retry: false });
  const [amount, setAmount] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState<{ kind: 'ok' | 'wait' | 'bad'; text: string } | null>(null);
  const tries = useRef(0);

  // Back from Paystack: confirm the top-up and show the result.
  const ref = params.get('funding') || '';
  useEffect(() => {
    if (!ref || !signedIn) return;
    let stop = false; let timer: any;
    setNote({ kind: 'wait', text: 'Confirming your payment…' });
    const run = async () => {
      try {
        const r = await checkFunding(ref);
        if (stop) return;
        if (r.status === 'paid') { setNote({ kind: 'ok', text: `${naira(r.amount)} added to your wallet.` }); qc.invalidateQueries({ queryKey: ['wallet'] }); setParams({}, { replace: true }); return; }
        if (r.status === 'failed') { setNote({ kind: 'bad', text: 'That payment was not completed. No money was taken.' }); return; }
        if (r.status === 'mismatch') { setNote({ kind: 'bad', text: 'The amount paid did not match. We will check it and contact you.' }); return; }
        if (++tries.current < 20) timer = setTimeout(run, 3000); else setNote({ kind: 'wait', text: 'Still waiting for Paystack. Your wallet will update once it confirms.' });
      } catch (e: any) { if (!stop) { if (++tries.current < 5) timer = setTimeout(run, 4000); else setNote({ kind: 'bad', text: e.message }); } }
    };
    run();
    return () => { stop = true; clearTimeout(timer); };
  }, [ref, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const fund = async () => {
    setErr('');
    if (!amount || amount < 100) { setErr('The smallest top-up is ₦100.'); return; }
    setBusy(true);
    try { const r = await fundWallet(Number(amount)); window.location.href = r.authorizationUrl; } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  const history = w.data?.history ?? [];
  const gotReferral = history.some((h) => h.kind === 'referral');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="My wallet | Smart Combo" description="Your Smart Combo wallet." />
      <Header />
      <CartDrawer />
      <main className="flex-1 section-padding py-8 md:py-12">
        <div className="container-premium max-w-lg">
          <h1 className="text-[28px] leading-tight font-black text-white">My wallet</h1>

          {!signedIn ? (
            <div className="mt-5 rounded-3xl border border-white/10 p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <WalletIcon className="w-9 h-9 text-primary mx-auto" />
              <p className="text-white font-bold mt-3">Sign in to use your wallet</p>
              <p className="text-sm text-white/60 mt-1">You will get a code by email. No password.</p>
              <Link to="/account" onClick={() => setReturnTo('/wallet')} className={`mt-4 min-h-[52px] px-6 rounded-2xl bg-primary text-black font-black inline-flex items-center justify-center ${FOCUS}`}>Sign in</Link>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {note && (
                <div role="status" className="flex items-start gap-2.5 rounded-xl border p-3 text-sm"
                  style={{ borderColor: note.kind === 'ok' ? 'rgba(52,211,153,0.4)' : note.kind === 'bad' ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.15)', background: note.kind === 'ok' ? 'rgba(52,211,153,0.1)' : note.kind === 'bad' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)', color: note.kind === 'ok' ? '#a7f3d0' : note.kind === 'bad' ? '#fecaca' : '#e5e5e5' }}>
                  {note.kind === 'wait' ? <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" /> : note.kind === 'ok' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}<span className="flex-1">{note.text}</span>
                  {note.kind === 'ok' && <Link to="/pay" className="shrink-0 font-black underline underline-offset-2">Continue buying</Link>}
                </div>
              )}

              <div className="rounded-3xl p-5 border" style={{ borderColor: 'rgba(255,200,40,0.4)', background: 'linear-gradient(160deg, rgba(255,200,40,0.16), rgba(255,200,40,0.04))' }}>
                <p className="text-[13px] font-bold text-white/70">Available balance</p>
                <p className="text-[40px] leading-[1.1] font-black text-primary tabular-nums mt-1">{w.isLoading ? '…' : w.data ? naira(w.data.balance) : '₦0'}</p>
                <p className="text-[12.5px] text-white/60 mt-2">Use it to pay on the Pay bills page. It cannot be withdrawn or sent to anyone.</p>
              </div>

              <div className="rounded-3xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <label htmlFor="fund-amount" className="text-sm font-black text-white">Add money</label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/15 bg-black/30 px-4 h-14 focus-within:border-primary">
                  <span className="text-xl font-black text-white/50">₦</span>
                  <input id="fund-amount" inputMode="numeric" placeholder="Amount" value={amount === '' ? '' : String(amount)}
                    onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); setAmount(n ? n : ''); }}
                    className="w-full bg-transparent text-2xl font-black text-white tabular-nums placeholder-white/25 outline-none" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {QUICK.map((q) => <button key={q} type="button" onClick={() => setAmount(q)} aria-pressed={amount === q}
                    className={`min-h-[44px] px-4 rounded-full border text-sm font-bold ${amount === q ? 'border-primary bg-primary/15 text-primary' : 'border-white/15 text-white/80'} ${FOCUS}`}>{naira(q)}</button>)}
                </div>
                {err && <p role="alert" className="text-sm text-red-300 mt-3">{err}</p>}
                <button type="button" onClick={fund} disabled={busy}
                  className={`mt-4 w-full h-14 rounded-2xl bg-primary text-black font-black text-[17px] inline-flex items-center justify-center gap-2.5 disabled:opacity-50 ${FOCUS}`}>
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-[18px] h-[18px]" strokeWidth={2.6} />} {amount && amount >= 100 ? `Add ${naira(Number(amount))}` : 'Add money'}
                </button>
                <p className="text-center text-[12.5px] text-white/45 mt-2">You pay on Paystack, then come straight back here. Smallest top-up ₦100.</p>
              </div>

              <div className="rounded-2xl border p-3.5 flex gap-3" style={{ borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.07)' }}>
                <Gift className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
                <p className="text-[13px] text-white/75 leading-relaxed">
                  <span className="font-bold text-emerald-300">Referral earnings land here.</span> When you earn from referrals, the money is added to this wallet and shows below as “Referral earnings”.
                  {gotReferral && ' You have already received some.'}
                </p>
              </div>

              <div>
                <h2 className="text-[15px] font-black text-white">History</h2>
                {w.isLoading ? <p className="text-sm text-white/50 mt-3">Loading…</p>
                  : history.length === 0 ? <p className="text-sm text-white/50 mt-3">Nothing yet. Add money to get started.</p>
                  : <ul className="divide-y divide-white/10 mt-1">{history.map((e) => <Row key={e.ref + e.at} e={e} />)}</ul>}
              </div>
              <Link to="/spending" className={`flex items-center justify-between rounded-2xl border border-white/10 px-4 min-h-[52px] text-sm font-bold text-white ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.04)' }}>My spending <span className="text-primary">See where your money goes ›</span></Link>
              <p className="text-[12px] text-white/40 leading-relaxed">By using the wallet you agree to our <Link to="/terms" className="underline">Terms</Link>. Wallet money is not a bank deposit and earns no interest.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
