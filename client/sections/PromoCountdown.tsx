import { useCountdown } from '@/hooks/useCountdown';
import type { PromoSettings } from '@/types/settings';

interface Props {
  promo: PromoSettings;
}

export function PromoCountdown({ promo }: Props) {
  const time = useCountdown(promo.enabled ? promo.endsAt : null);

  if (!promo.enabled || time.hasEnded) return null;

  const blocks = [
    { label: 'Days', value: time.days },
    { label: 'Hrs', value: time.hours },
    { label: 'Mins', value: time.minutes },
    { label: 'Secs', value: time.seconds },
  ];

  return (
    <section className="border-b border-primary/10" style={{ background: 'rgba(255,215,0,0.03)' }}>
      <div className="container-premium section-padding py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-primary/70 font-bold">⚡ Flash Promo</p>
            <p className="text-lg font-bold text-white">{promo.headline}</p>
            <p className="text-sm text-white/40">{promo.subline}</p>
          </div>
          <div className="flex items-center gap-2" aria-label="Promo countdown timer">
            {blocks.map((b, i) => (
              <div key={b.label} className="flex items-center gap-2">
                <div className="text-center glass-card px-4 py-3 rounded-xl min-w-[56px] border border-primary/20">
                  <div className="text-2xl font-black text-primary tabular-nums leading-none mb-1">
                    {String(b.value).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/35">{b.label}</div>
                </div>
                {i < blocks.length - 1 && <span className="text-primary/35 font-bold text-xl">:</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
