/**
 * ComboList — smart wrapper that picks between rich showcase and compact grid.
 *
 * - 1-2 combos: full ComboShowcase (rich, premium)
 * - 3+ combos:  responsive grid of ComboGridCard
 *
 * The threshold is set here in one place. Adjust GRID_THRESHOLD if you ever
 * want to tweak when the switch happens.
 */

import { ComboShowcase } from '@/sections/ComboShowcase';
import { ComboGridCard } from '@/sections/ComboGridCard';
import type { Combo } from '@/types/combo';

const GRID_THRESHOLD = 3;

interface Props {
  combos: Combo[];
  whatsappLink: string;
}

export function ComboList({ combos, whatsappLink }: Props) {
  if (!combos || combos.length === 0) return null;

  // 1-2 combos: rich showcase
  if (combos.length < GRID_THRESHOLD) {
    return <ComboShowcase combos={combos} whatsappLink={whatsappLink} />;
  }

  // 3+ combos: grid
  return (
    <section className="section-padding py-16">
      <div className="container-premium">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {combos.map((combo) => (
            <ComboGridCard key={combo.id} combo={combo} />
          ))}
        </div>
      </div>
    </section>
  );
}
