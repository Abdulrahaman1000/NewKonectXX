/**
 * Checkout — real implementation.
 *
 * NOTE: This page collects shipping + payment method, but the actual
 * createOrder() call will throw until the backend is built.
 * That's intentional. When backend lands, Phase 2:
 *  1) Replace the throw in api/orders.ts with real apiFetch
 *  2) Handle the paymentUrl redirect (Paystack/Flutterwave)
 *  3) Test the full flow
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { useCart } from '@/stores/cart';
import { useSettings } from '@/contexts/SettingsContext';
import { formatNaira } from '@/lib/format';
import { createOrder } from '@/api/orders';
import type { PaymentMethod } from '@/types/order';
import { toast } from 'sonner';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, savings, clear } = useCart();
  const { settings } = useSettings();

  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paystack');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    state: '',
    city: '',
    street: '',
    landmark: '',
    notes: '',
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Shipping fee: free for now (configure later from settings)
  const shippingFee = 0;
  const total = subtotal() + shippingFee;
  const isIlorin = form.state === 'Kwara' && form.city.toLowerCase().includes('ilorin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createOrder({
        items,
        shipping: {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          state: form.state,
          city: form.city,
          street: form.street,
          landmark: form.landmark || undefined,
        },
        paymentMethod,
        notes: form.notes || undefined,
      });

      // When backend exists, redirect to the payment provider
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      clear();
      toast.success('Order placed!');
      navigate(`/order-tracking?order=${result.order.orderNumber}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <CartDrawer />
        <main className="flex-1 flex items-center justify-center section-padding">
          <div className="container-premium max-w-md text-center space-y-6">
            <div className="text-6xl">🛒</div>
            <h1 className="text-3xl font-bold">Your cart is empty</h1>
            <p className="text-foreground/60">Add a combo to get started.</p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-12">
        <div className="container-premium max-w-6xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Continue shopping
          </Link>

          <h1 className="text-3xl md:text-4xl font-black mb-2 text-white">Checkout</h1>
          <p className="text-white/50 mb-8">Almost there — just a few details to complete your order.</p>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping */}
              <section
                className="rounded-2xl border border-white/10 p-6 space-y-4"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <h2 className="text-lg font-bold text-white">Shipping Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full name" required>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                      className="input-base"
                      placeholder="Aisha Mohammed"
                    />
                  </Field>

                  <Field label="Phone (WhatsApp preferred)" required>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      className="input-base"
                      placeholder="08012345678"
                      pattern="[0-9+\s]{10,15}"
                    />
                  </Field>
                </div>

                <Field label="Email" required>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="input-base"
                    placeholder="you@example.com"
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="State" required>
                    <select
                      required
                      value={form.state}
                      onChange={(e) => update('state', e.target.value)}
                      className="input-base"
                    >
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="City" required>
                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={(e) => update('city', e.target.value)}
                      className="input-base"
                      placeholder="Ilorin"
                    />
                  </Field>
                </div>

                <Field label="Street address" required>
                  <input
                    type="text"
                    required
                    value={form.street}
                    onChange={(e) => update('street', e.target.value)}
                    className="input-base"
                    placeholder="House number, street name, area"
                  />
                </Field>

                <Field label="Landmark (optional)">
                  <input
                    type="text"
                    value={form.landmark}
                    onChange={(e) => update('landmark', e.target.value)}
                    className="input-base"
                    placeholder="Near filling station, by the junction, etc."
                  />
                </Field>

                <Field label="Order notes (optional)">
                  <textarea
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    className="input-base min-h-[80px] resize-y"
                    placeholder="Any delivery instructions?"
                  />
                </Field>
              </section>

              {/* Payment */}
              <section
                className="rounded-2xl border border-white/10 p-6 space-y-4"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <h2 className="text-lg font-bold text-white">Payment Method</h2>

                <div className="space-y-3">
                  <PaymentOption
                    value="paystack"
                    selected={paymentMethod}
                    onChange={setPaymentMethod}
                    title="Paystack"
                    desc="Card · Bank Transfer · USSD · Mobile Money"
                  />
                  <PaymentOption
                    value="flutterwave"
                    selected={paymentMethod}
                    onChange={setPaymentMethod}
                    title="Flutterwave"
                    desc="Card · Bank Transfer · USSD · Mobile Money"
                  />
                  <PaymentOption
                    value="bank_transfer"
                    selected={paymentMethod}
                    onChange={setPaymentMethod}
                    title="Direct Bank Transfer"
                    desc="Manual transfer — we'll send account details"
                  />
                  {isIlorin && (
                    <PaymentOption
                      value="cod"
                      selected={paymentMethod}
                      onChange={setPaymentMethod}
                      title="Cash on Delivery"
                      desc="Ilorin only — pay when you receive"
                    />
                  )}
                </div>
              </section>
            </div>

            {/* Right — summary */}
            <aside className="lg:col-span-1">
              <div
                className="rounded-2xl border border-primary/20 p-6 sticky top-24"
                style={{ background: 'rgba(255,215,0,0.02)' }}
              >
                <h2 className="text-lg font-bold text-white mb-5">Order Summary</h2>

                <ul className="space-y-3 mb-5">
                  {items.map((item) => (
                    <li key={item.comboId} className="flex justify-between text-sm">
                      <div className="flex-1 pr-2">
                        <p className="text-white/85 font-medium">{item.comboName}</p>
                        <p className="text-white/40 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-white/70 tabular-nums">
                        {formatNaira(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <Row label="Subtotal" value={formatNaira(subtotal())} />
                  {savings() > 0 && (
                    <Row
                      label="You save"
                      value={`− ${formatNaira(savings())}`}
                      valueClass="text-emerald-400"
                    />
                  )}
                  <Row
                    label="Shipping"
                    value={shippingFee === 0 ? 'Free' : formatNaira(shippingFee)}
                    valueClass={shippingFee === 0 ? 'text-emerald-400' : ''}
                  />
                </div>

                <div className="border-t border-white/10 mt-4 pt-4 flex justify-between items-baseline">
                  <span className="font-bold text-white">Total</span>
                  <span className="text-2xl font-black text-primary">{formatNaira(total)}</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full mt-6 py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Place Order
                    </>
                  )}
                </button>

                {settings && (
                  <p className="text-[11px] text-white/40 text-center mt-4">
                    Need help?{' '}
                    <a
                      href={settings.contact.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Chat with us on WhatsApp
                    </a>
                  </p>
                )}
              </div>
            </aside>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Local components
// ──────────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-white/60 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className={`text-white/80 tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function PaymentOption({
  value,
  selected,
  onChange,
  title,
  desc,
}: {
  value: PaymentMethod;
  selected: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
  title: string;
  desc: string;
}) {
  const isSelected = selected === value;
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary/60 bg-primary/5'
          : 'border-white/10 hover:border-white/25'
      }`}
    >
      <input
        type="radio"
        name="payment"
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        className="mt-1 accent-primary"
      />
      <div className="flex-1">
        <p className="font-semibold text-white text-sm">{title}</p>
        <p className="text-xs text-white/50">{desc}</p>
      </div>
    </label>
  );
}
