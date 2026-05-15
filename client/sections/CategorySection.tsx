/**
 * CategorySection — section wrapper showing combos grouped by category.
 *
 * Hides itself when there are no combos. Shows up to `maxItems` combos
 * inline; if there are more, a "See all" link goes to /products?category=X.
 */

import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Combo } from '@/types/combo';
import type { Category } from '@/types/category';
import { ComboGridCard } from '@/sections/ComboGridCard';

interface Props {
  category: Pick<Category, 'slug' | 'name' | 'icon'>;
  combos: Combo[];
  maxItems?: number;
}

export function CategorySection({ category, combos, maxItems = 6 }: Props) {
  if (combos.length === 0) return null;

  const visible = combos.slice(0, maxItems);
  const hasMore = combos.length > maxItems;

  return (
    <section className="section-padding py-10 md:py-14">
      <div className="container-premium">
        <div className="flex items-end justify-between mb-5 md:mb-7">
          <div className="flex items-center gap-2">
            {category.icon && <span className="text-2xl md:text-3xl">{category.icon}</span>}
            <h2 className="text-lg md:text-2xl font-black text-white">{category.name}</h2>
          </div>
          {hasMore && (
            <Link
              to={`/products?category=${encodeURIComponent(category.slug)}`}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all"
            >
              See all
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {visible.map((combo) => (
            <ComboGridCard key={combo.id} combo={combo} />
          ))}
        </div>
      </div>
    </section>
  );
}
