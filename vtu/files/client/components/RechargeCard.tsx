/** SC-VTU  The "Recharge & pay bills" card for the home page. Place <RechargeCard /> where you want it (see TEST-vtu.md). */
import { Link } from 'react-router-dom';
import { Smartphone, Wifi, Zap } from 'lucide-react';

export function RechargeCard() {
  const items = [
    { to: '/pay?tab=airtime', label: 'Airtime', Icon: Smartphone },
    { to: '/pay?tab=data', label: 'Data', Icon: Wifi },
    { to: '/pay?tab=electricity', label: 'Electricity', Icon: Zap },
  ];
  return (
    <section className="rounded-2xl border border-primary/30 p-4 md:p-5" style={{ background: 'rgba(255,200,40,0.05)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-black text-white">Recharge &amp; pay bills</h2>
        <Link to="/pay" className="text-sm font-bold text-primary min-h-[44px] inline-flex items-center">See all ›</Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ to, label, Icon }) => (
          <Link key={label} to={to} className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 py-3 min-h-[76px] justify-center">
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-white">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
