/** SC-WAL  "How do you want to pay?" popup. Guest = pay straight on Paystack. Signed in = wallet or Paystack. */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Loader2, Wallet, X } from 'lucide-react';
import { naira } from '@/components/vtu/brand';

interface Props {
  open: boolean; onClose: () => void; total: number; busy: boolean; busyVia?: 'card' | 'wallet' | null;
  signedIn: boolean; balance: number | null; balanceLoading: boolean;
  onCard: () => void; onWallet: () => void;
  /** called just before leaving for sign-in or funding, so the form can be saved */
  onLeave: () => void;
}
const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-white/70';

export function PaySheet({ open, onClose, total, busy, busyVia, signedIn, balance, balanceLoading, onCard, onWallet, onLeave }: Props) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', k);
    const t = setTimeout(() => first.current?.focus(), 30);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); clearTimeout(t); document.body.style.overflow = prev; };
  }, [open, busy, onClose]);
  if (!open) return null;

  const enough = balance !== null && balance >= total;
  const short = balance !== null && !enough ? total - balance : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="presentation">
      <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-black/70" onClick={() => !busy && onClose()} />
      <div role="dialog" aria-modal="true" aria-labelledby="paysheet-title"
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#141414] px-4 pt-3 pb-5 max-h-[92vh] overflow-y-auto">
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="paysheet-title" className="text-xl font-black text-white">How do you want to pay?</h2>
            <p className="text-sm text-white/60 mt-0.5">Total <span className="font-bold text-primary tabular-nums">{naira(total)}</span></p>
          </div>
          <button type="button" aria-label="Close" disabled={busy} onClick={onClose} className={`w-11 h-11 -mt-1 -mr-1 grid place-items-center rounded-xl text-white/70 hover:text-white ${FOCUS}`}><X className="w-5 h-5" /></button>
        </div>

        <div className="mt-4 space-y-3">
          {/* Option 1: pay direct */}
          <button ref={first} type="button" disabled={busy} onClick={onCard}
            className={`w-full text-left rounded-2xl border border-white/15 bg-white/5 p-4 flex items-center gap-3.5 disabled:opacity-50 hover:bg-white/10 ${FOCUS}`}>
            <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={{ background: 'rgba(56,189,248,0.15)' }}><CreditCard className="w-5 h-5 text-sky-300" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black text-white">Pay direct</span>
              <span className="block text-[13px] text-white/60 leading-snug mt-0.5">Card, bank transfer or USSD on Paystack. No account needed.</span>
            </span>
            {busy && busyVia !== 'wallet' && <Loader2 className="w-5 h-5 animate-spin text-white/60" />}
          </button>

          {/* Option 2: wallet */}
          <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(255,200,40,0.45)', background: 'rgba(255,200,40,0.07)' }}>
            <div className="flex items-center gap-3.5">
              <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0 bg-primary/20"><Wallet className="w-5 h-5 text-primary" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black text-white">Smart Combo wallet</span>
                <span className="block text-[13px] text-white/60 leading-snug mt-0.5">
                  {signedIn
                    ? balanceLoading ? 'Checking your balance…' : balance !== null ? <>Balance <span className="font-bold text-white tabular-nums">{naira(balance)}</span></> : 'Could not load your balance.'
                    : 'Top up once, then pay in one tap. Sign in to use it.'}
                </span>
              </span>
            </div>
            {signedIn && enough && (
              <button type="button" disabled={busy} onClick={onWallet}
                className={`mt-3 w-full min-h-[52px] rounded-xl bg-primary text-black font-black text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-50 ${FOCUS}`}>
                {busy && busyVia !== 'card' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" strokeWidth={2.6} />} Pay {naira(total)} from wallet
              </button>
            )}
            {signedIn && !enough && !balanceLoading && balance !== null && (
              <>
                <p className="mt-3 text-[13px] text-amber-200">You need {naira(short)} more to pay from your wallet.</p>
                <Link to="/wallet" onClick={onLeave} className={`mt-2 w-full min-h-[52px] rounded-xl bg-primary text-black font-black text-[15px] inline-flex items-center justify-center ${FOCUS}`}>Fund wallet</Link>
              </>
            )}
            {!signedIn && (
              <Link to="/account" onClick={onLeave} className={`mt-3 w-full min-h-[52px] rounded-xl border border-primary/60 text-primary font-black text-[15px] inline-flex items-center justify-center ${FOCUS}`}>Sign in to use wallet</Link>
            )}
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-white/45 mt-4">Wallet money is for buying on Smart Combo. It cannot be withdrawn or sent to anyone. If a purchase fails, it goes back to your wallet straight away.</p>
      </div>
    </div>
  );
}
