/**
 * Free gift picker, shown at checkout once the customer has unlocked the gift.
 * Shows the gifts in stock; the customer taps one. Only one can be chosen.
 */

import { Check, Gift, Loader2 } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import type { BankGift } from '@/api/giftProgress';

interface Props {
  gifts: BankGift[] | null;
  selectedId?: string;
  onPick: (gift: BankGift) => void;
  /** Money from earlier orders that counted toward the gift, shown as a small note. */
  credit?: number;
}

export function GiftPicker({ gifts, selectedId, onPick, credit = 0 }: Props) {
  return (
    <div
      className="rounded-2xl border border-emerald-500/40 p-5"
      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.03))' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20">
          <Gift className="h-5 w-5 text-emerald-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-emerald-300">Choose your free gift</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-100/70">
            You unlocked a free gift. Pick one from the list below, and note that you can only pick one.
            Tap another to switch.
            {credit > 0 && ` This counts your ${formatNaira(credit)} spent in the last 30 days.`}
          </p>
        </div>
      </div>

      {gifts === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-300/70" />
        </div>
      ) : gifts.length === 0 ? (
        <p className="mt-4 rounded-lg bg-black/20 p-3 text-center text-xs text-white/60">
          All gifts are out of stock right now. You can still place your order.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gifts.map((g) => {
            const selected = g._id === selectedId;
            const photo = g.images?.[0] || g.image || '';
            const low = (g.stock ?? 0) > 0 && (g.stock ?? 0) <= 3;
            return (
              <button
                key={g._id}
                type="button"
                onClick={() => onPick(g)}
                aria-pressed={selected}
                className={`relative overflow-hidden rounded-xl border text-left transition-all ${
                  selected
                    ? 'border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-400'
                    : 'border-white/10 bg-white/[0.03] hover:border-emerald-500/50'
                }`}
              >
                <div className="relative aspect-square bg-black/40">
                  {photo ? (
                    <img src={photo} alt={g.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">🎁</div>
                  )}
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-black">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  {low && (
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      Only {g.stock} left
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-bold leading-tight text-white">{g.name}</p>
                  <p className="mt-1 text-[11px] text-white/50">
                    {g.price ? <span className="mr-1.5 line-through">{formatNaira(g.price)}</span> : null}
                    <span className="font-bold text-emerald-400">FREE</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
