/**
 * Admin Partners — /admin/resellers
 *
 * Review partner applications: approve (assigns the partner code), reject a pending
 * application, suspend or reinstate an approved partner, see payout details, keep private
 * notes, message them on WhatsApp, and edit the commission settings.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Ban,
  Check,
  Loader2,
  MessageCircle,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import {
  AdminReseller,
  ResellerStatus,
  deleteReseller,
  getResellerCounts,
  listResellersAdmin,
  saveResellerNotes,
  setResellerStatus,
} from '@/api/adminResellers';
import {
  ProgramSettings,
  getProgramSettings,
  saveProgramSettings,
} from '@/api/adminCommissions';
import { toast } from 'sonner';
import { useDialogs } from '@/components/shared/ConfirmProvider';

const TABS: { key: ResellerStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'suspended', label: 'Suspended' },
];

const EMPTY_TEXT: Record<ResellerStatus, string> = {
  pending: 'No applications waiting for review.',
  approved: 'No approved partners yet.',
  suspended: 'No suspended partners.',
};

const STATUS_CHIP: Record<ResellerStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  suspended: 'bg-red-500/15 text-red-300 border-red-500/25',
};

/** Message sent to a partner when approved: tells them where to log in. */
function approvalMessage(firstName: string, code: string) {
  return `Hi ${firstName}, good news! Your Smart Combo partner application has been approved. Your partner code is ${code}.\n\nLog in to your partner dashboard to get your personal link, ads and captions: ${window.location.origin}/partner\n\nUse the email and password you signed up with.`;
}

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** wa.me wants digits only with the country code. A leading 0 is treated as Nigeria (234). */
function waLink(rawNumber: string, message: string) {
  const digits = rawNumber.replace(/\D/g, '');
  const international = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminResellers() {
  const queryClient = useQueryClient();
  const { confirm } = useDialogs();
  const [status, setStatus] = useState<ResellerStatus>('pending');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());

  const { data: counts } = useQuery({
    queryKey: ['admin-reseller-counts'],
    queryFn: getResellerCounts,
  });

  const { data: resellers = [], isLoading } = useQuery({
    queryKey: ['admin-resellers', status, q],
    queryFn: () => listResellersAdmin({ status, q }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-resellers'] });
    queryClient.invalidateQueries({ queryKey: ['admin-reseller-counts'] });
  };

  const statusMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'approved' | 'suspended' }) =>
      setResellerStatus(id, next),
    onSuccess: (reseller, { next }) => {
      if (next === 'approved' && reseller.resellerCode) {
        toast.success(`Approved. Code ${reseller.resellerCode}`, {
          description: 'Let them know they can log in now.',
          duration: 15000,
          action: {
            label: 'Message on WhatsApp',
            onClick: () =>
              window.open(
                waLink(reseller.whatsapp, approvalMessage(reseller.fullName.trim().split(' ')[0], reseller.resellerCode!)),
                '_blank',
              ),
          },
        });
      } else {
        toast.success(next === 'approved' ? 'Approved' : 'Partner suspended');
      }
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'Could not update partner'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteReseller,
    onSuccess: () => {
      toast.success('Application rejected');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'Could not reject application'),
  });

  const busyId = statusMut.isPending
    ? statusMut.variables?.id
    : deleteMut.isPending
      ? deleteMut.variables
      : null;

  const handleReject = async (r: AdminReseller) => {
    if (await confirm({ title: 'Reject this application?', message: `The application from ${r.fullName} will be deleted. This cannot be undone.`, confirmText: 'Reject and delete', danger: true })) {
      deleteMut.mutate(r.id);
    }
  };

  const handleSuspend = async (r: AdminReseller) => {
    if (await confirm({ title: 'Suspend this partner?', message: `${r.fullName}${r.resellerCode ? ` (${r.resellerCode})` : ''} will lose access to the partner portal and ads.`, confirmText: 'Suspend', danger: true })) {
      statusMut.mutate({ id: r.id, next: 'suspended' });
    }
  };

  return (
    <AdminFrame>
      <SEO title="Partners — Admin" />

      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white">Partners</h1>
        <p className="text-white/50 text-sm mt-1">
          Review applications and manage who can share Smart Combo and earn commission.
        </p>
      </div>

      <ProgramSettingsCard />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Partner status">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              onClick={() => setStatus(tab.key)}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                status === tab.key
                  ? 'bg-primary text-black'
                  : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${status === tab.key ? 'text-black/60' : 'text-white/35'}`}>
                {counts?.[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, code"
            aria-label="Search partners"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : resellers.length === 0 ? (
        <p className="text-center py-16 text-white/40">
          {q ? `Nothing matches "${q}" in ${status}.` : EMPTY_TEXT[status]}
        </p>
      ) : (
        <div className="space-y-2">
          {resellers.map((r) => (
            <ResellerCard
              key={r.id}
              reseller={r}
              busy={busyId === r.id}
              onApprove={() => statusMut.mutate({ id: r.id, next: 'approved' })}
              onSuspend={() => handleSuspend(r)}
              onReject={() => handleReject(r)}
            />
          ))}
        </div>
      )}
    </AdminFrame>
  );
}

function ResellerCard({
  reseller: r,
  busy,
  onApprove,
  onSuspend,
  onReject,
}: {
  reseller: AdminReseller;
  busy: boolean;
  onApprove: () => void;
  onSuspend: () => void;
  onReject: () => void;
}) {
  const firstName = r.fullName.trim().split(' ')[0];
  const message =
    r.status === 'approved' && r.resellerCode
      ? approvalMessage(firstName, r.resellerCode)
      : `Hi ${firstName}, this is Smart Combo about your partner application.`;

  const btn =
    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div
      className="rounded-xl border border-white/10 p-4"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-white">{r.fullName}</h3>
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${STATUS_CHIP[r.status]}`}>
          {r.status}
        </span>
        {r.resellerCode && (
          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30">
            {r.resellerCode}
          </span>
        )}
        <span className="ml-auto text-[11px] text-white/35">Applied {formatDate(r.createdAt)}</span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/60">
        <div className="flex gap-2">
          <dt className="text-white/35 w-16 shrink-0">Phone</dt>
          <dd>{r.phone}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-white/35 w-16 shrink-0">WhatsApp</dt>
          <dd>{r.whatsapp}</dd>
        </div>
        <div className="flex gap-2 min-w-0">
          <dt className="text-white/35 w-16 shrink-0">Email</dt>
          <dd className="truncate">{r.email}</dd>
        </div>
        {r.channel && (
          <div className="flex gap-2 min-w-0">
            <dt className="text-white/35 w-16 shrink-0">Channel</dt>
            <dd className="truncate">{r.channel}</dd>
          </div>
        )}
        <div className="flex gap-2 min-w-0 sm:col-span-2">
          <dt className="text-white/35 w-16 shrink-0">Bank</dt>
          <dd className="min-w-0">
            {r.bankName && r.accountNumber ? (
              <>
                {r.bankName} · {r.accountNumber}
                {r.accountName ? ` · ${r.accountName}` : ''}
              </>
            ) : (
              <span className="text-white/35">Not provided (applied before bank details were required)</span>
            )}
          </dd>
        </div>
      </dl>

      <NotesField reseller={r} />

      <div className="flex flex-wrap items-center gap-2 mt-4">
        {r.status === 'pending' && (
          <>
            <button type="button" onClick={onApprove} disabled={busy} className={`btn-primary ${btn}`}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className={`${btn} border border-white/10 text-white/70 hover:border-red-500/40 hover:text-red-300`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reject
            </button>
          </>
        )}
        {r.status === 'approved' && (
          <button
            type="button"
            onClick={onSuspend}
            disabled={busy}
            className={`${btn} border border-white/10 text-white/70 hover:border-red-500/40 hover:text-red-300`}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
            Suspend
          </button>
        )}
        {r.status === 'suspended' && (
          <button type="button" onClick={onApprove} disabled={busy} className={`btn-primary ${btn}`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reinstate
          </button>
        )}

        {r.resellerCode && (
          <Link
            to={`/admin/partners/${r.id}`}
            className={`${btn} border border-white/10 text-white/70 hover:border-primary/40 hover:text-primary`}
          >
            View sales
          </Link>
        )}

        <a
          href={waLink(r.whatsapp, message)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} border border-white/10 text-white/70 hover:border-primary/40 hover:text-primary sm:ml-auto`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {r.status === 'approved' ? 'Send approval on WhatsApp' : 'WhatsApp'}
        </a>
      </div>
    </div>
  );
}

/** Private notes on one partner. Saved with the button, never shown to the partner. */
function NotesField({ reseller }: { reseller: AdminReseller }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(reseller.adminNotes ?? '');
  const dirty = notes.trim() !== (reseller.adminNotes ?? '').trim();

  const mut = useMutation({
    mutationFn: () => saveResellerNotes(reseller.id, notes),
    onSuccess: () => {
      toast.success('Note saved');
      queryClient.invalidateQueries({ queryKey: ['admin-resellers'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Could not save note'),
  });

  return (
    <div className="mt-3">
      <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-1">
        Private notes
      </label>
      <textarea
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={1000}
        placeholder="Only the admin team sees this..."
        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-xs text-white placeholder-white/30"
      />
      {dirty && (
        <button
          type="button"
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-white/70 hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save note
        </button>
      )}
    </div>
  );
}

/** Commission rates, hold period and minimum withdrawal. Applies to future orders only. */
function ProgramSettingsCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-program-settings'],
    queryFn: getProgramSettings,
  });

  const [form, setForm] = useState({ comboPercent: '', singlePercent: '', holdDays: '', minWithdrawal: '' });

  useEffect(() => {
    if (data) {
      setForm({
        comboPercent: String(data.comboPercent),
        singlePercent: String(data.singlePercent),
        holdDays: String(data.holdDays),
        minWithdrawal: String(data.minWithdrawal),
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: (input: ProgramSettings) => saveProgramSettings(input),
    onSuccess: () => {
      toast.success('Commission settings saved');
      queryClient.invalidateQueries({ queryKey: ['admin-program-settings'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Could not save settings'),
  });

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate({
      comboPercent: Number(form.comboPercent),
      singlePercent: Number(form.singlePercent),
      holdDays: Number(form.holdDays),
      minWithdrawal: Number(form.minWithdrawal),
    });
  };

  const field = (key: keyof typeof form, label: string, suffix: string) => (
    <label className="block">
      <span className="block text-[11px] text-white/45 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white"
        />
        <span className="text-xs text-white/40 shrink-0">{suffix}</span>
      </div>
    </label>
  );

  return (
    <form
      onSubmit={onSave}
      className="rounded-xl border border-white/10 p-4 mb-6"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">Commission settings</h2>
      <p className="text-[11px] text-white/35 mt-1 mb-4">
        Changes apply to new orders only. Orders already placed keep the rate they were created with.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {field('comboPercent', 'Combos (2+ items)', '%')}
        {field('singlePercent', 'Single products', '%')}
        {field('holdDays', 'Wait after delivery', 'days')}
        {field('minWithdrawal', 'Minimum withdrawal', '₦')}
      </div>
      <button
        type="submit"
        disabled={mut.isPending || !data}
        className="btn-primary mt-4 flex items-center gap-2 px-4 py-2 text-xs font-bold disabled:opacity-50"
      >
        {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save settings
      </button>
    </form>
  );
}
