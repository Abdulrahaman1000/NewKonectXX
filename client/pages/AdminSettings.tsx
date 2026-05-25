/**
 * Admin Site Settings — /admin/settings
 * NEW: Hero Section block (headline + subtext) — editable platform hero copy.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import {
  AdminSiteSettings,
  getAdminSettings,
  updateAdminSettings,
} from '@/api/adminSettings';
import { toast } from 'sonner';

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: getAdminSettings,
  });

  const [form, setForm] = useState<AdminSiteSettings | null>(null);
  const [codCitiesInput, setCodCitiesInput] = useState('');

  useEffect(() => {
    if (settings) {
      setForm(settings);
      setCodCitiesInput((settings.shipping?.codCities ?? []).join(', '));
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (payload: Partial<AdminSiteSettings>) => updateAdminSettings(payload),
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save'),
  });

  if (isLoading || !form) {
    return (
      <AdminFrame>
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      </AdminFrame>
    );
  }

  const set = (path: string, value: any) => {
    setForm((f) => {
      if (!f) return f;
      const next: any = JSON.parse(JSON.stringify(f));
      const keys = path.split('.');
      let target = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (target[keys[i]] === undefined || target[keys[i]] === null) target[keys[i]] = {};
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = () => {
    if (!form) return;

    const codCities = codCitiesInput
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    const payload: Partial<AdminSiteSettings> = {
      storeName: form.storeName,
      tagline: form.tagline,
      hero: form.hero,
      promo: form.promo,
      contact: form.contact,
      video: form.video,
      trustStats: form.trustStats,
      bankAccount: form.bankAccount,
      shipping: { ...form.shipping, codCities },
    };

    saveMut.mutate(payload);
  };

  const promoEndsAtLocal = form.promo.endsAt
    ? new Date(form.promo.endsAt).toISOString().slice(0, 16)
    : '';

  const saving = saveMut.isPending;

  // Defensive defaults if hero missing on older docs
  const heroHeadline = form.hero?.headline ?? '';
  const heroSubtext = form.hero?.subtext ?? '';

  return (
    <AdminFrame>
      <SEO title="Site Settings — Admin" />

      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Site Settings</h1>
          <p className="text-white/50 text-sm mt-1">Hero, contact info, bank, shipping, promo, and more</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save settings
        </button>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Hero Section */}
        <Section title="Homepage hero" subtitle="The big headline and text at the top of your homepage">
          <Field label="Headline" hint="Keep it short and punchy — this is the biggest text on your site">
            <input
              type="text"
              value={heroHeadline}
              onChange={(e) => set('hero.headline', e.target.value)}
              className={inputCls}
              placeholder="Premium Combos. One Smart Price."
            />
          </Field>
          <Field label="Subtext" hint="One or two sentences explaining what you offer">
            <textarea
              rows={3}
              value={heroSubtext}
              onChange={(e) => set('hero.subtext', e.target.value)}
              className={inputCls}
              placeholder="Curated bundles across tech, fashion & lifestyle — handpicked, quality-checked, and priced to save you thousands."
            />
          </Field>
        </Section>

        {/* Contact */}
        <Section title="Contact info" subtitle="Shown in footer, contact page, and order receipts">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone (display)">
              <input
                type="tel"
                value={form.contact.phone}
                onChange={(e) => set('contact.phone', e.target.value)}
                className={inputCls}
                placeholder="+234 814 274 6379"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.contact.email}
                onChange={(e) => set('contact.email', e.target.value)}
                className={inputCls}
                placeholder="hello@smartcombo.com"
              />
            </Field>
          </div>
          <Field label="WhatsApp number" hint="Just the number, no formatting (e.g. 2348142746379)">
            <input
              type="text"
              value={form.contact.whatsappNumber}
              onChange={(e) => set('contact.whatsappNumber', e.target.value)}
              className={inputCls}
              placeholder="2348142746379"
            />
          </Field>
          <Field label="Address">
            <input
              type="text"
              value={form.contact.address}
              onChange={(e) => set('contact.address', e.target.value)}
              className={inputCls}
              placeholder="Ilorin, Kwara State, Nigeria"
            />
          </Field>
        </Section>

        {/* Bank account */}
        <Section title="Bank account" subtitle="Shown to customers who pick bank transfer at checkout">
          <Field label="Bank name">
            <input
              type="text"
              value={form.bankAccount.bankName}
              onChange={(e) => set('bankAccount.bankName', e.target.value)}
              className={inputCls}
              placeholder="GTBank"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
            <Field label="Account name">
              <input
                type="text"
                value={form.bankAccount.accountName}
                onChange={(e) => set('bankAccount.accountName', e.target.value)}
                className={inputCls}
                placeholder="Smart Combo Ltd"
              />
            </Field>
            <Field label="Account number">
              <input
                type="text"
                value={form.bankAccount.accountNumber}
                onChange={(e) => set('bankAccount.accountNumber', e.target.value)}
                className={inputCls}
                placeholder="0123456789"
                inputMode="numeric"
              />
            </Field>
          </div>
        </Section>

        {/* Shipping */}
        <Section title="Shipping" subtitle="Shipping fee and free-shipping rules">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Standard shipping fee (₦)">
              <input
                type="number"
                value={form.shipping.standardFee}
                onChange={(e) => set('shipping.standardFee', Number(e.target.value) || 0)}
                className={inputCls}
                min={0}
              />
            </Field>
            <Field label="Free shipping above (₦)" hint="0 = disabled">
              <input
                type="number"
                value={form.shipping.freeShippingThreshold}
                onChange={(e) => set('shipping.freeShippingThreshold', Number(e.target.value) || 0)}
                className={inputCls}
                min={0}
              />
            </Field>
          </div>
          <Field label="COD cities" hint="Comma-separated. Customers in these cities get free shipping with cash on delivery.">
            <input
              type="text"
              value={codCitiesInput}
              onChange={(e) => setCodCitiesInput(e.target.value)}
              className={inputCls}
              placeholder="ilorin, lagos, abuja"
            />
          </Field>
        </Section>

        {/* Promo */}
        <Section title="Promo countdown" subtitle="The countdown timer shown on the homepage">
          <label className="flex items-center gap-2 cursor-pointer mb-1">
            <input
              type="checkbox"
              checked={form.promo.enabled}
              onChange={(e) => set('promo.enabled', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-white">Show promo on homepage</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Headline">
              <input
                type="text"
                value={form.promo.headline}
                onChange={(e) => set('promo.headline', e.target.value)}
                className={inputCls}
                placeholder="Special offer ending soon"
              />
            </Field>
            <Field label="Subline">
              <input
                type="text"
                value={form.promo.subline}
                onChange={(e) => set('promo.subline', e.target.value)}
                className={inputCls}
                placeholder="Save 48% on the Smart Combo Pack"
              />
            </Field>
          </div>
          <Field label="Ends at">
            <input
              type="datetime-local"
              value={promoEndsAtLocal}
              onChange={(e) => {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) set('promo.endsAt', date.toISOString());
              }}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Trust stats */}
        <Section title="Trust stats" subtitle="The rating + review count shown on the homepage and trust bar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Rating (0-5)">
              <input
                type="number"
                step="0.1"
                min={0}
                max={5}
                value={form.trustStats.rating}
                onChange={(e) => set('trustStats.rating', Number(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
            <Field label="Review count">
              <input
                type="number"
                min={0}
                value={form.trustStats.reviewCount}
                onChange={(e) => set('trustStats.reviewCount', Number(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* Video */}
        <Section title="Demo video" subtitle="The video block shown on the homepage">
          <Field label="Video URL" hint="YouTube embed URL or direct MP4">
            <input
              type="text"
              value={form.video.url}
              onChange={(e) => set('video.url', e.target.value)}
              className={inputCls}
              placeholder="https://www.youtube.com/embed/..."
            />
          </Field>
          <Field label="Thumbnail URL">
            <input
              type="text"
              value={form.video.thumbnail}
              onChange={(e) => set('video.thumbnail', e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
            <Field label="Title">
              <input
                type="text"
                value={form.video.title}
                onChange={(e) => set('video.title', e.target.value)}
                className={inputCls}
                placeholder="See the combo in action"
              />
            </Field>
            <Field label="Duration">
              <input
                type="text"
                value={form.video.duration}
                onChange={(e) => set('video.duration', e.target.value)}
                className={inputCls}
                placeholder="2:34"
              />
            </Field>
          </div>
        </Section>

        {/* Store identity */}
        <Section title="Store identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Store name">
              <input
                type="text"
                value={form.storeName}
                onChange={(e) => set('storeName', e.target.value)}
                className={inputCls}
                placeholder="Smart Combo"
              />
            </Field>
            <Field label="Tagline" hint="Used in footer. The big hero headline is set in 'Homepage hero' above.">
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                className={inputCls}
                placeholder="Style · Tech · Luxury"
              />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save settings
          </button>
        </div>
      </div>
    </AdminFrame>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 p-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <h2 className="text-sm font-black text-white mb-1">{title}</h2>
      {subtitle && <p className="text-[11px] text-white/40 mb-4">{subtitle}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
        {label}
      </span>
      {children}
      {hint && <p className="text-[10px] text-white/40 mt-1">{hint}</p>}
    </label>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors';
