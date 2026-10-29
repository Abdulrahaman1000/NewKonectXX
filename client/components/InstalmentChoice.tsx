/**
 * Checkout: "Pay in instalments" choice (SC-INST). Shown only when the server says this cart can be paid in parts.
 * The customer picks how many payments, reads the rules in plain words and ticks the box.
 */
import { formatNaira } from '@/lib/format';
import type { QuoteResult } from '@/api/instalments';

export interface InstValue {
  on: boolean;
  parts: number;
  ack: boolean;
}

const dateIn = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

export function InstalmentChoice({
  quote,
  value,
  onChange,
  local,
  cityKnown,
}: {
  quote: QuoteResult;
  value: InstValue;
  onChange: (v: InstValue) => void;
  local: boolean;
  cityKnown: boolean;
}) {
  const q = quote.quote;
  if (!quote.eligible || !q) return null;
  const chosen = q.options.find((o) => o.parts === value.parts) ?? q.options[0];

  return (
    <div className="rounded-2xl border border-primary/30 p-4 md:p-5" style={{ background: 'rgba(255,200,40,0.05)' }} data-testid="instalment-choice">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm md:text-base font-black text-primary">Pay in instalments</p>
          <p className="text-[13px] text-white/70 leading-relaxed mt-0.5">
            Pay part now and the rest within {q.days} days. We send your goods after your last payment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...value, on: !value.on })}
          aria-pressed={value.on}
          className={`shrink-0 min-h-[44px] rounded-lg border px-3 text-[13px] font-bold ${
            value.on ? 'border-primary bg-primary text-black' : 'border-white/20 text-white/85 hover:bg-white/5'
          }`}
        >
          {value.on ? 'Instalments on' : 'Use instalments'}
        </button>
      </div>

      {value.on && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">How many payments?</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o) => (
                <button
                  key={o.parts}
                  type="button"
                  onClick={() => onChange({ ...value, parts: o.parts })}
                  aria-pressed={chosen.parts === o.parts}
                  className={`min-h-[44px] flex-1 basis-32 rounded-lg border px-3 text-left ${
                    chosen.parts === o.parts ? 'border-primary bg-primary/10' : 'border-white/15 hover:bg-white/5'
                  }`}
                >
                  <span className="block text-[13px] font-black text-white">{o.parts} payments</span>
                  <span className="block text-[11px] text-white/60">
                    {formatNaira(o.firstAmount)} now, then {formatNaira(o.laterEach)}
                    {o.parts > 2 ? ' each' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-[12px] leading-relaxed text-white/75 space-y-1.5">
            <p>
              You pay <b className="text-white">{formatNaira(chosen.firstAmount)}</b> now. The rest, {formatNaira((q.total ?? 0) - chosen.firstAmount)}, is
              due by <b className="text-white">{dateIn(q.days)}</b>. You can pay it in the payments you chose, or all at once.
            </p>
            <p>Your goods are sent only after you have paid everything.</p>
            <p>
              Once you pay, you cannot get your money back if you change your mind. If you stop paying, what you paid is kept for you as store credit
              for 90 days (not cash).
            </p>
            <p>If you need more time, you can ask for 3 to 7 extra days, once.</p>
            <p>
              {!cityKnown
                ? 'Enter your city above to see delivery.'
                : local
                  ? 'Delivery in Ilorin is ₦1,000. It is already in your total.'
                  : 'Delivery is by Jumia. You pay Jumia directly, not us.'}
            </p>
            <p>A free gift cannot be added to an instalment order.</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={value.ack}
              onChange={(e) => onChange({ ...value, ack: e.target.checked })}
              className="mt-0.5 w-5 h-5 accent-yellow-400"
              data-testid="instalment-ack"
            />
            <span className="text-sm font-bold text-white">I understand and agree to these instalment rules.</span>
          </label>
        </div>
      )}
    </div>
  );
}
