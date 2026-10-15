/**
 * "Become a partner" section for the homepage (phones and computers).
 * Explains the program in plain words first; the sign-up form opens from the button.
 * The header's "Become a partner" link scrolls here (#reseller).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { ResellerSignupModal } from '@/components/shared/ResellerSignupModal';

const STEPS = [
  {
    title: 'Sign up',
    text: 'Fill in a short form with your details and your bank account. It is free.',
  },
  {
    title: 'Get approved',
    text: 'We check your form. When you are approved, you can log in to your partner page.',
  },
  {
    title: 'Share your link',
    text: 'You get your own link, plus ready-made pictures, videos and captions to post on WhatsApp, Instagram and TikTok.',
  },
  {
    title: 'Get paid',
    text: 'When someone buys with your link and the order is delivered, you earn money. You can withdraw it every week.',
  },
] as const;

const GOOD_TO_KNOW = [
  'You do not buy any stock.',
  'You do not deliver anything. We do that.',
  'You earn on sales, not on clicks or sign-ups.',
  'Cancelled or refunded orders do not earn commission.',
] as const;

export function PartnerSection() {
  const [open, setOpen] = useState(false);

  return (
    <section id="reseller" className="force-dark section-padding scroll-mt-24 py-8 md:py-14">
      <div className="container-premium">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-[#1b1a14] to-[#0e0e0e] p-5 md:p-8 lg:p-12">
          {/* Headline */}
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Partner program</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white md:text-4xl">
              Earn money by sharing our products.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/70">
              Become a Smart Combo partner. Share your link. When people buy, you get paid.
              You do not need any money to start.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            {/* How it works */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">How it works</h3>
              <ol className="mt-4 space-y-4">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-black">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-base font-bold text-white">{step.title}</p>
                      <p className="text-sm leading-snug text-white/65">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* What you earn + good to know */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary/90">What you earn</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/30 p-3">
                    <p className="text-3xl font-black text-white">5%</p>
                    <p className="mt-0.5 text-sm text-white/65">on every combo sold</p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-3">
                    <p className="text-3xl font-black text-white">10%</p>
                    <p className="mt-0.5 text-sm text-white/65">on every single product sold</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-snug text-white/70">
                  Example: someone buys a ₦40,000 combo with your link. You earn ₦2,000.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">How you get paid</h3>
                <p className="mt-2 text-sm leading-snug text-white/70">
                  Your first delivered sale starts a 7-day week. When the week ends, everything you earned
                  can be withdrawn to your bank account. The smallest withdrawal is ₦2,000.
                </p>
              </div>

              <ul className="space-y-1.5 px-1">
                {GOOD_TO_KNOW.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Call to action */}
          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 px-8 text-base font-bold sm:w-auto"
            >
              Fill the partner form
              <ChevronRight className="h-5 w-5" />
            </button>
            <p className="text-sm text-white/60">
              Already a partner?{' '}
              <Link to="/partner" className="font-semibold text-primary underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <ResellerSignupModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
