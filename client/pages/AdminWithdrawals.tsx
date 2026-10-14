/**
 * Admin Payouts — /admin/payouts  (Destination: client/pages/AdminWithdrawals.tsx)
 * Weekly routine: open "Requested", pay each partner from your bank app using the details shown
 * (Copy buttons help), then press "Mark as paid".
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Copy, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDialogs } from '@/components/shared/ConfirmProvider';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import {
  AdminWithdrawal,
  WithdrawalStatus,
  listWithdrawals,
  markWithdrawalPaid,
  rejectWithdrawal,
} from '@/api/adminWithdrawals';

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;
const date = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

const TABS: { key: WithdrawalStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Declined' },
];

function copy(text: string, what: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied`), () => toast.error('Could not copy'));
}

function Row({ w, onChange }: { w: AdminWithdrawal; onChange: () => void }) {
  const { confirm, ask } = useDialogs();
  const pay = useMutation({
    mutationFn: () => markWithdrawalPaid(w.id),
    onSuccess: (r) => {
      toast.success(r.paidAmount !== w.amount ? `Marked paid: ${naira(r.paidAmount ?? 0)} (some orders were cancelled)` : 'Marked as paid');
      onChange();
    },
    onError: (e: any) => toast.error(e?.message || 'Could not mark as paid'),
  });
  const reject = useMutation({
    mutationFn: (note: string) => rejectWithdrawal(w.id, note),
    onSuccess: () => { toast.success('Declined. The money is back in the partner balance.'); onChange(); },
    onError: (e: any) => toast.error(e?.message || 'Could not decline'),
  });

  return (
    <div className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{w.partnerName} <span className="font-normal text-white/40">· {w.resellerCode}</span></p>
          <p className="text-xs text-white/40">Requested {date(w.createdAt)} · {w.orderCount} order{w.orderCount === 1 ? '' : 's'}</p>
        </div>
        <p className="text-lg font-black text-white">{naira(w.status === 'paid' ? w.paidAmount ?? w.amount : w.amount)}</p>
      </div>

      <div className="mt-3 rounded-lg bg-black/30 p-3 text-xs text-white/70 space-y-1">
        <div className="flex justify-between"><span>Bank</span><span className="text-white">{w.bankName}</span></div>
        <div className="flex justify-between items-center">
          <span>Account number</span>
          <button onClick={() => copy(w.accountNumber, 'Account number')} className="flex items-center gap-1 text-white">
            {w.accountNumber} <Copy className="w-3 h-3 text-primary" />
          </button>
        </div>
        <div className="flex justify-between"><span>Account name</span><span className="text-white">{w.accountName}</span></div>
      </div>

      <Link to={`/admin/partners/${w.resellerId}?withdrawal=${w.id}`} className="mt-3 inline-block text-xs font-bold text-primary underline">
        View this partner's sales
      </Link>

      {w.adminNote && <p className="mt-2 text-xs text-amber-300">{w.adminNote}</p>}
      {w.status === 'paid' && w.paidAt && <p className="mt-2 text-xs text-emerald-300">Paid {date(w.paidAt)}</p>}

      {w.status === 'requested' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={async () => {
              const ok = await confirm({
                title: 'Mark as paid?',
                message: `Confirm you have sent ${naira(w.amount)} to ${w.accountName} (${w.bankName} ${w.accountNumber}).`,
                confirmText: 'Yes, mark as paid',
              });
              if (ok) pay.mutate();
            }}
            disabled={pay.isPending || reject.isPending}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {pay.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Mark as paid
          </button>
          <button
            onClick={async () => {
              const note = await ask({
                title: 'Decline this withdrawal?',
                message: 'The money goes back to the partner balance.',
                label: 'Reason (the partner will see this)',
                confirmText: 'Decline',
                danger: true,
              });
              if (note !== null) reject.mutate(note);
            }}
            disabled={pay.isPending || reject.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border border-white/10 text-red-300 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" /> Decline
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminWithdrawals() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<WithdrawalStatus>('requested');
  const q = useQuery({ queryKey: ['admin-withdrawals', status], queryFn: () => listWithdrawals(status) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
  const total = status === 'requested' ? (q.data?.items ?? []).reduce((n, w) => n + w.amount, 0) : 0;

  return (
    <AdminFrame>
      <SEO title="Payouts — Admin" />
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
      </Link>
      <h1 className="text-xl font-bold text-white">Partner payouts</h1>
      <p className="text-xs text-white/40 mt-1 mb-4">Pay each partner from your bank, then mark the request as paid.</p>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${status === t.key ? 'border-primary text-primary' : 'border-white/10 text-white/50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {total > 0 && <p className="text-sm text-white/70 mb-3">Total waiting: <b className="text-white">{naira(total)}</b></p>}

      {q.isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      ) : (q.data?.items ?? []).length === 0 ? (
        <p className="text-sm text-white/40">Nothing here.</p>
      ) : (
        <div className="space-y-3">{q.data!.items.map((w) => <Row key={w.id} w={w} onChange={refresh} />)}</div>
      )}
    </AdminFrame>
  );
}
