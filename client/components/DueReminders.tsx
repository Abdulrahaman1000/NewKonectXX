/** SC-REM  "Due soon" renewals (with Buy again) and the low-wallet alert. Shows nothing when there is nothing to say or the customer is signed out. */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BellRing, Wallet } from 'lucide-react';
import { naira } from '@/components/vtu/brand';
import { getReminders, dueText, type Reminder } from '@/api/reminders';
import { getWallet, hasCustomerToken } from '@/api/wallet';
import { savePayDraft } from '@/lib/customerSession';

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-white/70';

export function DueReminders({ onBuyAgain }: { onBuyAgain?: (draft: Record<string, any>) => void }) {
  const signedIn = hasCustomerToken();
  const rem = useQuery({ queryKey: ['reminders'], queryFn: getReminders, enabled: signedIn, retry: false, staleTime: 30_000 });
  const wal = useQuery({ queryKey: ['wallet'], queryFn: getWallet, enabled: signedIn, retry: false, staleTime: 30_000 });
  if (!signedIn || !rem.data) return null;

  const due = rem.data.reminders.filter((r) => r.state === 'due' || r.state === 'soon');
  const low = rem.data.lowBalance > 0 && wal.data && wal.data.balance < rem.data.lowBalance ? { limit: rem.data.lowBalance, balance: wal.data.balance } : null;
  if (!due.length && !low) return null;

  const go = (r: Reminder) => {
    if (onBuyAgain) onBuyAgain(r.draft);
    else { savePayDraft(r.draft); window.location.assign('/pay'); }
  };

  return (
    <div className="mb-5 space-y-2.5">
      {low && (
        <Link to="/wallet" className={`flex items-center gap-3 rounded-2xl border px-4 min-h-[60px] ${FOCUS}`} style={{ borderColor: 'rgba(248,113,113,0.45)', background: 'rgba(248,113,113,0.08)' }}>
          <Wallet className="w-5 h-5 text-red-300 shrink-0" />
          <span className="flex-1 min-w-0"><span className="block text-[14px] font-black text-white leading-tight">Your wallet is low</span><span className="block text-[12.5px] text-white/65 leading-snug">{naira(low.balance)} left. You asked to be told below {naira(low.limit)}.</span></span>
          <span className="text-[13px] font-black text-white">Add money ›</span>
        </Link>
      )}
      {due.slice(0, 3).map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: r.state === 'due' ? 'rgba(255,200,40,0.55)' : 'rgba(255,255,255,0.15)', background: r.state === 'due' ? 'rgba(255,200,40,0.09)' : 'rgba(255,255,255,0.04)' }}>
          <BellRing className={`w-5 h-5 shrink-0 ${r.state === 'due' ? 'text-primary' : 'text-white/60'}`} />
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-black text-white leading-tight break-words">{r.label}</span>
            <span className={`block text-[12.5px] leading-snug ${r.state === 'due' ? 'text-primary font-bold' : 'text-white/60'}`}>{dueText(r)}</span>
          </span>
          <button type="button" onClick={() => go(r)} className={`shrink-0 min-h-[44px] px-4 rounded-xl bg-primary text-black text-[13px] font-black ${FOCUS}`}>Buy again</button>
        </div>
      ))}
      {due.length > 3 && <Link to="/reminders" className={`block text-center text-[13px] font-bold text-white/70 min-h-[44px] leading-[44px] ${FOCUS}`}>See all {due.length} reminders ›</Link>}
    </div>
  );
}
