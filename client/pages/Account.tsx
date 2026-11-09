/**
 * SC-ACCT  /account : sign in with an emailed code, then see your orders.
 * One page, four steps: email -> code -> (first time) name and phone -> orders.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, LogOut, Mail, Package, Wallet } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import {
  addOrder, fetchMe, fetchMyOrders, requestCode, saveProfile, verifyCode,
  type AccountOrder, type Customer,
} from '@/api/account';
import { myPurchases, type VtuView } from '@/api/vtu';
import { clearCustomerToken, getCustomerToken, setCustomerToken, takeReturnTo } from '@/lib/customerSession';
import { getWallet } from '@/api/wallet'; // SC-NAV
import { DueReminders } from '@/components/DueReminders'; // SC-REM
import { openTour } from '@/lib/tourState'; // SC-TOUR

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
const inputCls = 'w-full min-h-[48px] rounded-xl bg-white/5 border border-white/15 px-4 text-white placeholder-white/35 outline-none focus:border-primary';
const btnCls = 'w-full min-h-[48px] rounded-xl bg-primary text-black font-black disabled:opacity-60 inline-flex items-center justify-center gap-2';

type Step = 'loading' | 'email' | 'code' | 'profile' | 'home';

export default function Account() {
  const navigate = useNavigate(); // SC-NAV
  const [walletBal, setWalletBal] = useState<number | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [recharges, setRecharges] = useState<VtuView[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [addNum, setAddNum] = useState('');
  const [addPhone, setAddPhone] = useState('');

  const enter = useCallback(async (c: Customer) => {
    setCustomer(c);
    if (c.needsProfile) { setName(c.name); setPhone(c.phone); setStep('profile'); return; }
    setStep('home');
    getWallet().then((w) => setWalletBal(w.balance)).catch(() => { /* wallet card shows without a balance */ });
    try { setOrders((await fetchMyOrders()).orders); } catch { /* shown empty */ }
    try { setRecharges(await myPurchases()); } catch { /* recharge may be switched off */ }
  }, []);

  useEffect(() => {
    if (!getCustomerToken()) { setStep('email'); return; }
    fetchMe().then((r) => enter(r.customer)).catch(() => setStep('email'));
  }, [enter]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e: any) { setErr(e?.message || 'Something went wrong.'); } finally { setBusy(false); }
  };

  const sendCode = () => run(async () => { await requestCode(email.trim()); setCode(''); setStep('code'); });
  const checkCode = () => run(async () => {
    const r = await verifyCode(email.trim(), code);
    setCustomerToken(r.token);
    if (!r.customer.needsProfile) { navigate(takeReturnTo() || '/pay', { replace: true }); return; } // SC-NAV back to where they were
    await enter(r.customer);
  });
  const saveMe = () => run(async () => { await saveProfile(name, phone); navigate(takeReturnTo() || '/pay', { replace: true }); }); // SC-NAV
  const addOne = () => run(async () => {
    await addOrder(addNum, addPhone);
    setAddNum(''); setAddPhone('');
    setOrders((await fetchMyOrders()).orders);
  });
  const signOut = () => { clearCustomerToken(); setCustomer(null); setOrders([]); setEmail(''); setStep('email'); };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="My account | Smart Combo" description="Sign in to see your Smart Combo orders." />
      <Header />
      <CartDrawer />
      <main className="flex-1 section-padding py-10 md:py-14">
        <div className="container-premium max-w-lg">
          {step === 'loading' && <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>}

          {(step === 'email' || step === 'code') && (
            <div className="rounded-2xl border border-white/10 p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <h1 className="text-2xl font-black text-white mb-1">Sign in</h1>
              <p className="text-sm text-white/60 mb-5">No password. We email you a 6-digit code.</p>
              {step === 'email' ? (
                <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-3">
                  <input className={inputCls} type="email" inputMode="email" autoComplete="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <button className={btnCls} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send me a code</button>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); checkCode(); }} className="space-y-3">
                  <p className="text-sm text-white/75">We sent a code to <strong>{email}</strong>. It works for 10 minutes.</p>
                  <input className={inputCls + ' text-center text-2xl tracking-[0.4em] font-black'} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus required />
                  <button className={btnCls} disabled={busy || code.length !== 6}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in</button>
                  <button type="button" className="w-full text-xs text-white/55 hover:text-primary min-h-[40px]" onClick={() => { setErr(''); setStep('email'); }}>Use a different email, or send the code again</button>
                </form>
              )}
              {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
            </div>
          )}

          {step === 'profile' && (
            <form onSubmit={(e) => { e.preventDefault(); saveMe(); }} className="rounded-2xl border border-white/10 p-5 md:p-6 space-y-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <h1 className="text-2xl font-black text-white">Welcome</h1>
              <p className="text-sm text-white/60">Just your name and phone number. We use the phone number to recognise your orders.</p>
              <input className={inputCls} placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
              <input className={inputCls} type="tel" inputMode="tel" autoComplete="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <button className={btnCls} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue</button>
              {err && <p className="text-sm text-red-400">{err}</p>}
            </form>
          )}

          {step === 'home' && customer && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black text-white">Hello, {customer.name.split(' ')[0]}</h1>
                  <p className="text-xs text-white/50">{customer.email} · {customer.phone}</p>
                </div>
                <button onClick={signOut} className="min-h-[44px] px-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-primary"><LogOut className="w-4 h-4" /> Sign out</button>
              </div>

              <Link to="/wallet" className="flex items-center gap-3 rounded-2xl border px-4 min-h-[60px]" style={{ borderColor: 'rgba(255,200,40,0.4)', background: 'rgba(255,200,40,0.08)' }}>
                <Wallet className="w-5 h-5 text-primary shrink-0" />
                <span className="flex-1"><span className="block text-xs text-white/60">My wallet</span><span className="block text-lg font-black text-primary tabular-nums">{walletBal === null ? 'View' : naira(walletBal)}</span></span>
                <span className="text-sm font-black text-white">Add money ›</span>
              </Link>

              <button type="button" onClick={openTour} className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 min-h-[52px] text-sm font-bold text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>Watch the Smart Combo tour <span className="text-primary">Play ›</span></button> {/* SC-TOUR */}
              <DueReminders /> {/* SC-REM */}
              <Link to="/reminders" className="flex items-center justify-between rounded-2xl border border-white/10 px-4 min-h-[52px] text-sm font-bold text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>My reminders <span className="text-primary">Renewals and wallet alert ›</span></Link> {/* SC-REM */}
              <Link to="/spending" className="flex items-center justify-between rounded-2xl border border-white/10 px-4 min-h-[52px] text-sm font-bold text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>My spending <span className="text-primary">See where your money goes ›</span></Link> {/* SC-SPEND */}

              <section>
                <h2 className="text-sm font-black text-white mb-2">Your orders</h2>
                {orders.length === 0 ? (
                  <p className="text-sm text-white/55 rounded-2xl border border-white/10 p-4">No orders here yet. Orders placed with this email show up automatically. For an older order, add it below.</p>
                ) : (
                  <ul className="space-y-2">
                    {orders.map((o) => (
                      <li key={o.orderNumber}>
                        <Link to={`/order-tracking?order=${encodeURIComponent(o.orderNumber)}&phone=${encodeURIComponent(customer.phone)}`} className="block rounded-2xl border border-white/10 p-4 hover:border-primary/60" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-white inline-flex items-center gap-2"><Package className="w-4 h-4 text-primary" />{o.orderNumber}</span>
                            <span className="text-sm font-black text-primary">{naira(o.total)}</span>
                          </div>
                          <p className="text-xs text-white/60 mt-1">{o.firstItem}{o.itemCount > 1 ? ` and more` : ''} · {new Date(o.createdAt).toLocaleDateString('en-NG')} · {o.status}</p>
                          {o.plan && o.plan.status !== 'paid' && (
                            <p className="text-xs text-primary mt-1 font-bold">Instalments: {naira(o.plan.paidTotal)} paid. Tap to pay the rest.</p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {recharges.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-black text-white">Airtime, data and electricity</h2>
                    <Link to="/pay" className="text-xs font-bold text-primary min-h-[44px] inline-flex items-center">Buy again ›</Link>
                  </div>
                  <ul className="space-y-2">
                    {recharges.map((r) => (
                      <li key={r.reference}>
                        <Link to={`/pay/result?reference=${encodeURIComponent(r.reference)}`} className="block rounded-2xl border border-white/10 p-3 hover:border-primary/60" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-bold text-white">{r.service === 'electricity' ? `${r.network} electricity` : `${r.network} ${r.planName}`}</span>
                            <span className="text-sm font-black text-primary">{naira(r.amount)}</span>
                          </div>
                          <p className="text-xs text-white/55 mt-0.5">{r.phone || (r.meter ? `Meter ${r.meter.number}` : '')} · {new Date(r.createdAt).toLocaleDateString('en-NG')} · {r.fulfilmentStatus === 'successful' ? 'Delivered' : r.fulfilmentStatus === 'failed' ? 'Failed, refunded' : r.paymentStatus === 'pending' ? 'Not paid' : 'In progress'}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="rounded-2xl border border-white/10 p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <h2 className="text-sm font-black text-white">Add an older order</h2>
                <p className="text-xs text-white/55">Type the order number and the phone number you used when you ordered.</p>
                <form onSubmit={(e) => { e.preventDefault(); addOne(); }} className="space-y-2">
                  <input className={inputCls} placeholder="Order number, e.g. SC-2026-000049" value={addNum} onChange={(e) => setAddNum(e.target.value)} required />
                  <input className={inputCls} type="tel" inputMode="tel" placeholder="Phone used on the order" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} required />
                  <button className={btnCls} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Add this order</button>
                </form>
                {err && <p className="text-sm text-red-400">{err}</p>}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
