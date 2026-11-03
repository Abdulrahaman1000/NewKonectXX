/** SC-UI  Shared look for the recharge screens: the four service icons, network colours, and money formatting. */
import { Smartphone, Wifi, Zap, Tv, type LucideIcon } from 'lucide-react';

export const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

export type ServiceKey = 'airtime' | 'data' | 'electricity' | 'tv';
export interface ServiceLook { k: ServiceKey; label: string; Icon: LucideIcon; tint: string; soft: string; soon?: boolean }
export const SERVICES: ServiceLook[] = [
  { k: 'airtime', label: 'Airtime', Icon: Smartphone, tint: '#FFC828', soft: 'rgba(255,200,40,0.14)' },
  { k: 'data', label: 'Data', Icon: Wifi, tint: '#38BDF8', soft: 'rgba(56,189,248,0.14)' },
  { k: 'electricity', label: 'Electricity', Icon: Zap, tint: '#FB923C', soft: 'rgba(251,146,60,0.15)' },
  { k: 'tv', label: 'TV', Icon: Tv, tint: '#A78BFA', soft: 'rgba(167,139,250,0.14)', soon: true },
];
export const serviceLook = (k: string) => SERVICES.find((s) => s.k === k) ?? SERVICES[0];

/** Simple colour discs, not the networks' logos. */
const NET: Record<string, { bg: string; fg: string; mark: string }> = {
  MTN: { bg: '#FFCC00', fg: '#1A1A1A', mark: 'MTN' },
  Airtel: { bg: '#E4002B', fg: '#FFFFFF', mark: 'a' },
  Glo: { bg: '#3DAE2B', fg: '#FFFFFF', mark: 'glo' },
  '9mobile': { bg: '#B6D334', fg: '#0B3D1E', mark: '9' },
};
export function NetworkDot({ name, size = 36 }: { name: string; size?: number }) {
  const b = NET[name] ?? { bg: '#555', fg: '#fff', mark: name.slice(0, 1) };
  return (
    <span aria-hidden className="grid place-items-center rounded-full font-black leading-none shrink-0" style={{ width: size, height: size, background: b.bg, color: b.fg, fontSize: b.mark.length > 2 ? size * 0.3 : size * 0.4 }}>
      {b.mark}
    </span>
  );
}

/** The rounded square holding a service icon. `solid` fills it with the service colour (selected look). */
export function ServiceBadge({ k, size = 48, solid = false }: { k: string; size?: number; solid?: boolean }) {
  const s = serviceLook(k);
  return (
    <span aria-hidden className="grid place-items-center shrink-0" style={{ width: size, height: size, borderRadius: size * 0.3, background: solid ? s.tint : s.soft }}>
      <s.Icon style={{ width: size * 0.5, height: size * 0.5, color: solid ? '#141414' : s.tint }} strokeWidth={2.2} />
    </span>
  );
}
