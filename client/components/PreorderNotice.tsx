/**
 * Pre-order notice for a product page, plus a hook other pieces can use.
 * Shows nothing unless the product is a pre-order item (switch on and no stock).
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { fetchComboBySlug } from '@/api/combos';
import { preorderInfo, type PreorderInfo } from '@/lib/preorder';
import type { Combo } from '@/types/combo';
import { HelpLine } from '@/components/HelpLine';

export function usePreorder(combo?: Combo): PreorderInfo {
  const { slug } = useParams<{ slug: string }>();
  const { data } = useQuery({
    queryKey: ['combo', slug],
    queryFn: () => fetchComboBySlug(slug!),
    enabled: !combo && !!slug,
  });
  return preorderInfo(combo ?? data);
}

export function PreorderNotice({ combo }: { combo?: Combo }) {
  const p = usePreorder(combo);
  if (!p.active) return null;
  return (
    <div
      className="mt-5 rounded-2xl border border-primary/40 p-4"
      style={{ background: 'rgba(255,200,40,0.08)' }}
      data-testid="preorder-notice"
    >
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
        <div>
          <p className="text-[15px] font-black text-primary">Pre-order</p>
          <p className="mt-1 text-[14px] leading-relaxed text-white/80">
            We get this item for you after you pay. It arrives in {p.min} to {p.max} business days. If we cannot get it,
            you get your money back.
          </p>
          <HelpLine className="mt-3" topic="a pre-order" />
        </div>
      </div>
    </div>
  );
}
