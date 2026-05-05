import { Check, Headphones, Shield, Truck } from 'lucide-react';

const ITEMS = [
  { Icon: Truck, text: 'Free Nationwide Delivery' },
  { Icon: Shield, text: '1-Year Warranty' },
  { Icon: Check, text: '14-Day Returns' },
  { Icon: Headphones, text: '24/7 WhatsApp Support' },
];

export function TrustBar() {
  return (
    <div className="border-y border-primary/15" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="container-premium section-padding py-4">
        <div className="flex flex-wrap items-center justify-center md:justify-between gap-x-8 gap-y-3">
          {ITEMS.map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-[12px] text-white/45">
              <Icon className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
              <span className="font-medium tracking-wide">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
