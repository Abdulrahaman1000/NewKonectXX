/**
 * Checkout — now includes Paystack online payment option.
 *
 * Flow:
 *  1. Customer fills shipping + picks payment method
 *  2. Submit calls POST /api/orders → creates order
 *  3. If method is "paystack": redirect to Paystack checkout
 *     Otherwise: navigate straight to /order-confirmation/:orderNumber
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { useCart } from '@/stores/cart';
import { useSettings } from '@/contexts/SettingsContext';
import { formatNaira } from '@/lib/format';
import { createOrder } from '@/api/orders';
import { initializePaystack } from '@/api/payments';
import { ApiError } from '@/api/client';
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

  const codCities = (settings?.shipping?.codCities ?? ['ilorin']).map((c) => c.toLowerCase());
  const isCodEligible =
    form.city.trim() !== '' &&
    codCities.some((c) => form.city.toLowerCase().trim() === c);

  const standardFee = settings?.shipping?.standardFee ?? 3500;
  const estimatedShipping =
    paymentMethod === 'cod' && isCodEligible ? 0 : standardFee;

  const computedSubtotal = subtotal();
  const total = computedSubtotal + estimatedShipping;

  const handlePaymentChange = (method: PaymentMethod) => {
    if (method === 'cod' && !isCodEligible) {
      toast.error(
        `Cash on delivery is only available in: ${codCities
          .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
          .join(', ')}`,
      );
      return;
    }
    setPaymentMethod(method);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const requiredFields: (keyof typeof form)[] = [
      'fullName', 'phone', 'email', 'state', 'city', 'street',
    ];
    for (const f of requiredFields) {
      if (!form[f]?.trim()) {
        toast.error(`Please fill in: ${f.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Create the order in our DB
      const order = await createOrder({
        items,
        shipping: {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          state: form.state,
          city: form.city.trim(),
          street: form.street.trim(),
          landmark: form.landmark?.trim() || undefined,
        },
        paymentMethod,
        notes: form.notes?.trim() || undefined,
      });

      // 2. If Paystack, get checkout URL and redirect
      if (paymentMethod === 'paystack') {
        try {
          const init = await initializePaystack(order.orderNumber);
          // Save phone so the confirmation page can fall back to tracking
          sessionStorage.setItem(
            `order:${order.orderNumber}:phone`,
            form.phone.trim(),
          );
          // Clear cart before leaving (order is created either way)
          clear();
          // Redirect to Paystack — they'll come back via callback URL
          window.location.href = init.authorizationUrl;
          return;
        } catch (err) {
          // If Paystack init fails, fall through to confirmation page —
          // customer can still see their order and try paying again from there.
          if (err instanceof ApiError) {
            toast.error(`Payment setup failed: ${err.message}`);
          } else {
            toast.error('Could not start payment. Try again from the order page.');
          }
          clear();
          navigate(`/order-confirmation/${order.orderNumber}`, {
            state: { order, phone: form.phone.trim() },
          });
          return;
        }
      }

      // 3. Other payment methods — straight to confirmation
      clear();
      toast.success(`Order ${order.orderNumber} placed!`);
      navigate(`/order-confirmation/${order.orderNumber}`, {
        state: { order, phone: form.phone.trim() },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <CartDrawer />
        <main className="flex-1 section-padding py-20">
          <div className="container-premium text-center">
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
              Your cart is empty
            </h1>
            <p className="text-white/50 mb-6">Add a combo to your cart to continue.</p>
            <Link
              to="/products"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold"
            >
              View products
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

      <main className="flex-1 section-padding py-10">
        <div className="container-premium max-w-5xl">
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-6"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to products
          </Link>

          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Checkout</h1>
          <p className="text-white/50 text-sm mb-8">
            Confirm your details and place your order. We'll contact you shortly.
          </p>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
            <div className="space-y-6">
              <Section title="Contact information">
                <Field label="Full name" required>
                  <input type="text" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className={inputCls} placeholder="Aisha Mohammed" />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Phone" required>
                    <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputCls} placeholder="+234 800 000 0000" />
                  </Field>
                  <Field label="Email" required>
                    <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputCls} placeholder="you@example.com" />
                  </Field>
                </div>
              </Section>

              <Section title="Delivery address">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="State" required>
                    <select value={form.state} onChange={(e) => update('state', e.target.value)} className={inputCls}>
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="City" required>
                    <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className={inputCls} placeholder="Ilorin" />
                  </Field>
                </div>
                <Field label="Street address" required>
                  <input type="text" value={form.street} onChange={(e) => update('street', e.target.value)} className={inputCls} placeholder="No 12, Tanke road" />
                </Field>
                <Field label="Landmark (optional)">
                  <input type="text" value={form.landmark} onChange={(e) => update('landmark', e.target.value)} className={inputCls} placeholder="Near Diamond Bank" />
                </Field>
                <Field label="Order notes (optional)">
                  <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} className={inputCls} placeholder="Anything we should know?" />
                </Field>
              </Section>

              {/* COD_BANNER_INSERTED */}
              {isCodEligible && (
                <div
                  className="rounded-2xl border border-emerald-500/40 p-4 md:p-5"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 text-emerald-300">
                        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-base font-black text-emerald-300 mb-0.5">
                        Great news — you qualify for Pay on Delivery!
                      </p>
                      <p className="text-[12px] md:text-[13px] text-emerald-100/70 leading-relaxed">
                        FREE delivery in {form.city || 'your area'}. No upfront payment needed — pay cash to our delivery person when your combo arrives.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Section title="Payment method">
                <div className="space-y-2">
                  <PaymentOption
                    value="paystack"
                    selected={paymentMethod}
                    onSelect={handlePaymentChange}
                    title="Pay online (card, transfer, USSD)"
                    description="Secure payment via Paystack. Fastest confirmation."
                    badge="RECOMMENDED"
                  />
                  <PaymentOption
                    value="bank_transfer"
                    selected={paymentMethod}
                    onSelect={handlePaymentChange}
                    title="Direct bank transfer"
                    description="Pay to our account, we confirm and ship."
                  />
                  <PaymentOption
                    value="cod"
                    selected={paymentMethod}
                    onSelect={handlePaymentChange}
                    title="Cash on delivery"
                    description={
                      isCodEligible
                        ? 'Pay when delivered. Free shipping in your area.'
                        : `Only available in: ${codCities.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`
                    }
                    disabled={!isCodEligible}
                  />
                  <PaymentOption
                    value="whatsapp"
                    selected={paymentMethod}
                    onSelect={handlePaymentChange}
                    title="Pay via WhatsApp"
                    description="We'll DM you with payment options."
                  />
                </div>
              </Section>
            </div>

            <aside
              className="rounded-2xl border border-primary/20 p-5 h-fit lg:sticky lg:top-24"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <h2 className="text-sm font-black text-white mb-4">Order summary</h2>

              <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.comboId} className="flex gap-3">
                    {item.image && (
                      <img src={item.image} alt={item.comboName} className="w-14 h-14 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.comboName}</p>
                      <p className="text-[10px] text-white/40">Qty {item.quantity}</p>
                      <p className="text-xs text-primary font-bold">{formatNaira(item.unitPrice * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-xs border-t border-white/10 pt-4">
                <Row label="Subtotal" value={formatNaira(computedSubtotal)} />
                <Row label="Shipping (estimate)" value={estimatedShipping === 0 ? 'Free' : formatNaira(estimatedShipping)} />
                {savings() > 0 && <Row label="You save" value={formatNaira(savings())} accent="emerald" />}
              </div>
              <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
                <span className="text-sm text-white/70 font-bold">Total</span>
                <span className="text-lg text-primary font-black tabular-nums">{formatNaira(total)}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full mt-5 py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Placing order...</>
                ) : paymentMethod === 'paystack' ? (
                  <><CreditCard className="w-4 h-4" />Pay {formatNaira(total)} now</>
                ) : (
                  <>Place order — {formatNaira(total)}</>
                )}
              </button>

              <p className="mt-3 text-[10px] text-white/30 text-center">
                {paymentMethod === 'paystack'
                  ? 'You will be redirected to Paystack to complete payment.'
                  : 'Final shipping fee confirmed by us based on your delivery zone.'}
              </p>
            </aside>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <h2 className="text-sm font-black text-white mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-primary/70">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = 'w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors';

function Row({ label, value, accent }: { label: string; value: string; accent?: 'emerald' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className={`tabular-nums font-medium ${accent === 'emerald' ? 'text-emerald-400' : 'text-white/80'}`}>{value}</span>
    </div>
  );
}

function PaymentOption({
  value, selected, onSelect, title, description, disabled, badge,
}: {
  value: PaymentMethod;
  selected: PaymentMethod;
  onSelect: (m: PaymentMethod) => void;
  title: string;
  description: string;
  disabled?: boolean;
  badge?: string;
}) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(value)}
      disabled={disabled}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary/50 bg-primary/5'
          : disabled
          ? 'border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed'
          : 'border-white/10 hover:border-white/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 ${isSelected ? 'border-primary bg-primary' : 'border-white/30'}`}>
          {isSelected && <div className="w-full h-full rounded-full bg-primary scale-50" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{title}</p>
            {badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-white/50">{description}</p>
        </div>
      </div>
    </button>
  );
}
