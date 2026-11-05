/** SC-VTU / SC-UI  The "Recharge & pay bills" card for the home page. Place <RechargeCard /> where you want it. */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { SERVICES, ServiceBadge } from '@/components/vtu/brand';
import { getCatalog } from '@/api/vtu';

export function RechargeCard() {
  // Same query key as /pay, so the answer is shared. TV and exam pins show only when the provider sells them.
  const { data: catalog } = useQuery({ queryKey: ['vtu-catalog'], queryFn: getCatalog, retry: false });
  const items = SERVICES.filter((s) => s.k === 'airtime' || s.k === 'data' || s.k === 'electricity' || (s.k === 'tv' && catalog?.tv) || (s.k === 'exam' && catalog?.exam));
  return (
    <section className="rounded-3xl border border-white/10 p-4 md:p-5" style={{ background: 'rgba(255,255,255,0.035)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base md:text-lg font-black text-white">Recharge &amp; pay bills</h2>
          <p className="text-xs text-white/55 mt-0.5">No sign-up. Pay for each purchase.</p>
        </div>
        <Link to="/pay" className="text-sm font-bold text-primary min-h-[44px] inline-flex items-center gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded-lg px-1">
          See all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {items.map((s) => (
          <Link key={s.k} to={`/pay?tab=${s.k}`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 pt-3.5 pb-3 min-h-[96px] basis-[calc(33.333%-0.45rem)] grow-0 motion-safe:transition-colors hover:border-white/25 outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
            <ServiceBadge k={s.k} size={46} />
            <span className="text-[12.5px] font-bold text-white/85">{s.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
