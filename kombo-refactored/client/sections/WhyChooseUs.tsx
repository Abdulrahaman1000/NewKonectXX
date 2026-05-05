import { Check, Headphones, Shield, Truck } from 'lucide-react';

const ITEMS = [
  { Icon: Check,      title: 'Authentic Products',       desc: 'Genuine, original items sourced directly from manufacturers. No fakes, no compromises.' },
  { Icon: Truck,      title: 'Fast Nationwide Delivery', desc: 'Ilorin gets delivery in 2–3 days. Every other state in 5–7 business days.' },
  { Icon: Shield,     title: 'Secure Payment',           desc: 'Paystack, Flutterwave, Bank Transfer — multiple trusted options with full buyer protection.' },
  { Icon: Headphones, title: 'Expert Support',           desc: '24/7 customer care via WhatsApp. Real people, real solutions, anytime.' },
];

export function WhyChooseUs() {
  return (
    <section className="section-padding py-20" style={{ background: 'rgba(0,0,0,0.2)' }}>
      <div className="container-premium">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">Our promise</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3 text-white">Why Choose Smart Combo?</h2>
          <p className="text-white/45 max-w-md mx-auto text-[15px]">
            We stand behind every product with genuine commitment to your satisfaction
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {ITEMS.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-5 p-7 rounded-2xl border border-white/8 hover:border-primary/25 transition-colors"
              style={{ background: 'rgba(255,255,255,0.015)' }}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
                <p className="text-[13px] text-white/45 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
