/**
 * VariantSelector — reusable component shown under each combo item.
 *
 * Renders a row of small thumbnails: default + each alternative.
 * Selected thumbnail has a gold ring and checkmark overlay.
 *
 * Used by both ComboShowcase (homepage) and ComboDetail.
 */

import { Check } from 'lucide-react';
import type { ComboItem } from '@/types/combo';

const DEFAULT_ID = 'default';

interface Props {
  item: ComboItem;
  selectedId: string;
  onPick: (variantId: string) => void;
  compact?: boolean;
}

export function VariantSelector({ item, selectedId, onPick, compact = false }: Props) {
  const options = [
    {
      id: DEFAULT_ID,
      name: item.name,
      thumbUrl: item.images?.[0]?.url ?? '',
    },
    ...(item.alternatives ?? []).map((alt) => ({
      id: alt.id,
      name: alt.name,
      thumbUrl: alt.images?.[0]?.url ?? '',
    })),
  ];

  if (options.length <= 1) return null;

  const thumbSize = compact ? 'w-11 h-11' : 'w-14 h-14';

  return (
    <div className="w-full">
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">
        Pick your preference
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {options.map((opt) => {
          const isSelected = opt.id === selectedId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPick(opt.id);
              }}
              title={opt.name}
              className={`relative ${thumbSize} rounded-lg overflow-hidden transition-all flex-shrink-0 ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                  : 'opacity-60 hover:opacity-100 ring-1 ring-white/10'
              }`}
            >
              {opt.thumbUrl ? (
                <img src={opt.thumbUrl} alt={opt.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-[8px] text-white/30">
                  No img
                </div>
              )}
              {isSelected && (
                <div className="absolute inset-0 bg-primary/15 flex items-center justify-center">
                  <Check className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-primary drop-shadow`} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
