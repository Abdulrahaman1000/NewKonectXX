import { Battery, Droplets, Shield, Smartphone, Wind, Zap } from 'lucide-react';

const FEATURES = [
  { Icon: Zap,        title: 'Advanced Technology', desc: 'Latest chipsets and sensors for seamless performance' },
  { Icon: Battery,    title: 'Long Battery Life',   desc: '7–10 days of battery on a single charge' },
  { Icon: Shield,     title: 'Premium Build',       desc: 'Aerospace-grade materials built to last' },
  { Icon: Smartphone, title: 'Smart Integration',   desc: 'Works with iOS and Android seamlessly' },
  { Icon: Wind,       title: 'Lightweight',         desc: 'Engineered for all-day comfort' },
  { Icon: Droplets,   title: 'Water Resistant',     desc: 'IP68 rated for water and dust resistance' },
];

export function Features() {
  return (
    <section className="section-padding py-24">
      <div className="container-premium">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">Built different</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3 text-white">Premium Features</h2>
          <p className="text-white/45 max-w-md mx-auto text-[15px]">
            Cutting-edge technology meets premium craftsmanship
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-2xl border border-white/8 hover:border-primary/30 transition-colors group"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
              <p className="text-[13px] text-white/45 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
