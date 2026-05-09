/**
 * Admin combos list page — /admin/combos
 *
 * Table of all combos (active + hidden) with edit/delete buttons.
 * "+ New Combo" button opens /admin/combos/new
 */

import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Loader2,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import { deleteCombo, listCombosAdmin } from '@/api/adminCombos';
import { formatNaira } from '@/lib/format';
import { cldUrl } from '@/lib/cloudinary';
import { toast } from 'sonner';

export default function AdminCombos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['admin-combos'],
    queryFn: listCombosAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCombo,
    onSuccess: () => {
      toast.success('Combo hidden');
      queryClient.invalidateQueries({ queryKey: ['admin-combos'] });
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
    onError: () => toast.error('Failed to hide combo'),
  });

  return (
    <AdminFrame>
      <SEO title="Combos — Admin" />

      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Combos</h1>
          <p className="text-white/50 text-sm mt-1">{combos.length} total</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/combos/new')}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" />
          New combo
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : combos.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p className="mb-4">No combos yet.</p>
          <button
            type="button"
            onClick={() => navigate('/admin/combos/new')}
            className="text-primary text-sm hover:underline"
          >
            Create your first combo →
          </button>
        </div>
      ) : (
        <div
          className="rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase text-white/50 tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Combo</th>
                <th className="px-4 py-3 text-left">Categories</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((combo) => {
                const id = combo.id ?? '';
                const thumb = combo.items?.[0]?.images?.[0]?.url;
                return (
                  <tr key={id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {thumb && (
                          <img
                            src={cldUrl(thumb, 'w_100,h_100,c_fill,q_auto,f_auto')}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-white font-medium truncate">{combo.name}</p>
                            {combo.isFeatured && (
                              <Star className="w-3 h-3 fill-primary text-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-white/40 text-xs truncate">{combo.tagline}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(combo.categorySlugs ?? []).length === 0 ? (
                        <span className="text-white/30 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(combo.categorySlugs ?? []).slice(0, 3).map((slug) => (
                            <span
                              key={slug}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60"
                            >
                              {slug}
                            </span>
                          ))}
                          {(combo.categorySlugs ?? []).length > 3 && (
                            <span className="text-[9px] text-white/30">
                              +{(combo.categorySlugs ?? []).length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70 tabular-nums text-xs">
                      <p>{formatNaira(combo.totalPrice)}</p>
                      {combo.originalPrice > combo.totalPrice && (
                        <p className="text-white/30 line-through text-[10px]">
                          {formatNaira(combo.originalPrice)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70 tabular-nums">{combo.stockLeft}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          combo.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                            : 'bg-gray-500/15 text-gray-300 border-gray-500/25'
                        }`}
                      >
                        {combo.isActive ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/combos/${id}/edit`}
                          className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hide "${combo.name}"? Customers won't see it anymore.`)) {
                              deleteMutation.mutate(id);
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400"
                          aria-label="Hide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminFrame>
  );
}
