/**
 * ResellerSignupModal — "Become a partner" form, based on section 5 of the Partner Program plan.
 *
 * Name, phone, WhatsApp, email, password, bank details for payouts, and an optional
 * promotion channel. The updated plan asks for bank name, account number and
 * account name at sign-up so weekly payouts are never held up.
 *
 * Posts to POST /api/resellers/register (server/routes/resellers.ts).
 * On phones it slides up as a sheet; on larger screens it is a centred dialog.
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { registerReseller } from '@/api/resellers';

interface Props {
  open: boolean;
  onClose: () => void;
}

// text-base (16px) on purpose: smaller text makes iPhones zoom in when a field is focused.
const INPUT =
  'w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 aria-[invalid=true]:border-red-400/70';

const PHONE_RE = /^\+?\d{10,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const squash = (v: string) => v.replace(/[\s-]/g, '');
const ACCOUNT_RE = /^\d{10}$/;

// Suggestions only: the field accepts any bank name.
const BANKS = [
  'Access Bank',
  'First Bank',
  'GTBank',
  'Kuda',
  'Moniepoint',
  'OPay',
  'PalmPay',
  'Stanbic IBTC',
  'Sterling Bank',
  'UBA',
  'Union Bank',
  'Wema Bank',
  'Zenith Bank',
];

type FieldName =
  | 'fullName'
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'password'
  | 'bankName'
  | 'accountNumber'
  | 'accountName';
type Errors = Partial<Record<FieldName, string>>;

const EMPTY = {
  fullName: '',
  phone: '',
  whatsapp: '',
  email: '',
  password: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
  channel: '',
  website: '', // honeypot, see below
};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/80">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export function ResellerSignupModal({ open, onClose }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus the first field when the sheet opens
  useEffect(() => {
    if (open && !done) nameRef.current?.focus();
  }, [open, done]);

  // Lock page scroll while open, close on Escape
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleClose = () => {
    if (submitting) return;
    onClose();
    if (done) {
      // A finished application should not be sitting in the form next time it opens
      setForm(EMPTY);
      setSameWhatsapp(true);
      setShowPassword(false);
      setDone(false);
    }
    setErrors({});
    setFormError('');
  };

  const validate = (): Errors => {
    const found: Errors = {};
    if (form.fullName.trim().length < 2) found.fullName = 'Enter your full name.';
    if (!PHONE_RE.test(squash(form.phone))) found.phone = 'Enter a valid phone number, e.g. 08012345678.';
    if (!sameWhatsapp && !PHONE_RE.test(squash(form.whatsapp))) {
      found.whatsapp = 'Enter a valid WhatsApp number.';
    }
    if (!EMAIL_RE.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (form.password.length < 8) found.password = 'Use at least 8 characters.';
    if (form.bankName.trim().length < 2) found.bankName = 'Enter your bank name.';
    if (!ACCOUNT_RE.test(squash(form.accountNumber))) {
      found.accountNumber = 'Enter your 10-digit account number.';
    }
    if (form.accountName.trim().length < 2) found.accountName = 'Enter the name on the account.';
    return found;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const found = validate();
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await registerReseller({
        fullName: form.fullName.trim(),
        phone: squash(form.phone),
        whatsapp: squash(sameWhatsapp ? form.phone : form.whatsapp),
        email: form.email.trim(),
        password: form.password,
        bankName: form.bankName.trim(),
        accountNumber: squash(form.accountNumber),
        accountName: form.accountName.trim(),
        channel: form.channel.trim(),
        website: form.website,
      });
      setDone(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const describe = (name: FieldName) => (errors[name] ? `${name}-error` : undefined);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reseller-title"
        className="flex max-h-[calc(100dvh-0.5rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-primary/30 bg-gradient-to-b from-[#14161f] to-[#0c0d12] text-white shadow-[0_0_60px_rgba(255,215,0,0.12)] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div>
            <h2 id="reseller-title" className="text-xl font-black leading-tight">
              {done ? 'Application received' : 'Become a Smart Combo partner'}
            </h2>
            {!done && (
              <p className="mt-1 text-sm text-white/55">
                It takes a minute. We review every application.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5 pt-3"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="h-14 w-14 text-emerald-400" />
              <p className="mt-4 text-[15px] leading-snug text-white/80">
                Thanks{form.fullName.trim() ? `, ${form.fullName.trim().split(' ')[0]}` : ''}. We will
                review your application and message you on WhatsApp once you are approved.
              </p>
              <p className="mt-3 text-sm leading-snug text-white/60">
                After that, log in at <a href="/partner" className="font-semibold text-primary underline">Partner login</a> with
                the email and password you just chose to get your personal link and ready-made ads.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="btn-primary mt-6 flex h-12 w-full items-center justify-center px-4 text-base font-bold"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <Field id="fullName" label="Full name" error={errors.fullName}>
                <input
                  ref={nameRef}
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={set('fullName')}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={describe('fullName')}
                  className={INPUT}
                />
              </Field>

              <Field id="phone" label="Phone number" error={errors.phone}>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="08012345678"
                  aria-invalid={!!errors.phone}
                  aria-describedby={describe('phone')}
                  className={INPUT}
                />
              </Field>

              <div>
                <label className="flex min-h-[44px] items-center gap-3 text-sm text-white/75">
                  <input
                    type="checkbox"
                    checked={sameWhatsapp}
                    onChange={(e) => setSameWhatsapp(e.target.checked)}
                    className="h-5 w-5 accent-[hsl(var(--primary))]"
                  />
                  My WhatsApp number is the same
                </label>
                {!sameWhatsapp && (
                  <div className="mt-2">
                    <Field id="whatsapp" label="WhatsApp number" error={errors.whatsapp}>
                      <input
                        id="whatsapp"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={form.whatsapp}
                        onChange={set('whatsapp')}
                        aria-invalid={!!errors.whatsapp}
                        aria-describedby={describe('whatsapp')}
                        className={INPUT}
                      />
                    </Field>
                  </div>
                )}
              </div>

              <Field id="email" label="Email address" error={errors.email}>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={describe('email')}
                  className={INPUT}
                />
              </Field>

              <Field id="password" label="Password" error={errors.password}>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={set('password')}
                    placeholder="At least 8 characters"
                    aria-invalid={!!errors.password}
                    aria-describedby={describe('password')}
                    className={`${INPUT} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </Field>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Payout details</p>

                <Field id="bankName" label="Bank name" error={errors.bankName}>
                  <input
                    id="bankName"
                    type="text"
                    list="bank-suggestions"
                    autoComplete="off"
                    value={form.bankName}
                    onChange={set('bankName')}
                    aria-invalid={!!errors.bankName}
                    aria-describedby={describe('bankName')}
                    className={INPUT}
                  />
                  <datalist id="bank-suggestions">
                    {BANKS.map((bank) => (
                      <option key={bank} value={bank} />
                    ))}
                  </datalist>
                </Field>

                <Field id="accountNumber" label="Account number" error={errors.accountNumber}>
                  <input
                    id="accountNumber"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    value={form.accountNumber}
                    onChange={set('accountNumber')}
                    placeholder="10 digits"
                    aria-invalid={!!errors.accountNumber}
                    aria-describedby={describe('accountNumber')}
                    className={INPUT}
                  />
                </Field>

                <Field id="accountName" label="Account name" error={errors.accountName}>
                  <input
                    id="accountName"
                    type="text"
                    autoComplete="off"
                    value={form.accountName}
                    onChange={set('accountName')}
                    aria-invalid={!!errors.accountName}
                    aria-describedby={describe('accountName')}
                    className={INPUT}
                  />
                </Field>

                <p className="text-xs leading-snug text-white/45">
                  Used only to pay your commission. We never show it to anyone else.
                </p>
              </div>

              <Field id="channel" label="Social handle or main promotion channel (optional)">
                <input
                  id="channel"
                  type="text"
                  value={form.channel}
                  onChange={set('channel')}
                  placeholder="e.g. @yourname on TikTok"
                  maxLength={200}
                  className={INPUT}
                />
              </Field>

              {/* Honeypot: invisible to people, bots tend to fill it in. The server ignores those sign-ups. */}
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={set('website')}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
              />

              {formError && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex h-14 w-full items-center justify-center gap-2 px-4 text-base font-bold disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting
                  </>
                ) : (
                  'Apply to become a partner'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResellerSignupModal;
