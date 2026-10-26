/**
 * Checkout box for an order where some pieces are ready and some must be fetched.
 * The customer picks: send what is ready now (Ilorin only), or send everything together.
 */
import { formatNaira } from '@/lib/format';
import type { OrderPreview } from '@/api/orders';

export type PartialValue = 'now' | 'together';

export function PartialChoice({
  preview,
  value,
  onChange,
}: {
  preview: OrderPreview;
  value: PartialValue;
  onChange: (v: PartialValue) => void;
}) {
  const waitingLines = preview.lines.filter((l) => l.waiting > 0);
  const canNow = preview.local;
  const picked: PartialValue = canNow ? value : 'together';

  const opt = (v: PartialValue, title: string, text: string, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(v)}
      aria-pressed={picked === v}
      className={`w-full text-left rounded-xl border p-3 min-h-[56px] transition-colors disabled:opacity-40 ${
        picked === v ? 'border-primary bg-primary/10' : 'border-white/15 hover:bg-white/5'
      }`}
      data-testid={`partial-${v}`}
    >
      <span className="flex items-center gap-2 text-[14px] font-black text-white">
        <span
          className={`inline-block w-4 h-4 rounded-full border-2 ${
            picked === v ? 'border-primary bg-primary' : 'border-white/40'
          }`}
        />
        {title}
      </span>
      <span className="mt-1 block text-[12.5px] leading-relaxed text-white/65">{text}</span>
    </button>
  );

  return (
    <div className="rounded-2xl border border-primary/40 p-4 md:p-5" style={{ background: 'rgba(255,200,40,0.06)' }} data-testid="partial-choice">
      <p className="text-sm md:text-base font-black text-primary mb-1">Some pieces are ready, some are not yet</p>
      <ul className="mb-3 space-y-1 text-[13px] text-white/80">
        {waitingLines.map((l) => (
          <li key={l.comboId}>
            <b className="text-white">{l.name}:</b>{' '}
            {l.ready > 0 ? `${l.ready} ready now` : 'none ready'}, {l.waiting} more in {l.leadDaysMin} to {l.leadDaysMax}{' '}
            business days after you pay.
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        {opt(
          'now',
          'Send what is ready now',
          canNow
            ? 'We deliver the ready pieces in Ilorin straight away. The rest follow when they arrive. You pay once, and delivery is charged once.'
            : 'Only for delivery in Ilorin.',
          !canNow,
        )}
        {opt(
          'together',
          'Send everything together',
          canNow
            ? 'We wait for all the pieces, then deliver them in one go.'
            : 'Outside Ilorin everything goes to Jumia in one parcel, so we send it together once all pieces are here.',
        )}
      </div>
      <p className="mt-3 text-[12px] text-white/50">
        You pay {formatNaira(preview.subtotal)} for all pieces now. If we cannot get the rest, you get your money back for them.
      </p>
    </div>
  );
}
