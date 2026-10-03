/**
 * Admin Combos Management Page (/admin/combos)
 * Clean datatable with direct routing to /admin/combos/:id for editing.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Plus,
  Search,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SEO } from '@/components/shared/SEO';
import { fetchCombos } from '@/api/combos';
import { formatNaira } from '@/lib/format';
import { toast } from 'sonner';

export default function AdminCombosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['combos'],
    queryFn: () => fetchCombos(),
  });

  const filteredCombos = combos.filter((combo: any) =>
    combo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    combo.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/combos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error('Failed to delete combo');

      toast.success(`"${name}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    } catch (err: any) {
      toast.error(err.message || 'Error deleting combo');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Manage Combos - Admin" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/95 backdrop-blur">
        <div className="container-premium flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white">Manage Combos</h1>
              <p className="text-xs text-white/50">{combos.length} total combos available</p>
            </div>
          </div>

          <Link
            to="/admin/combos/new"
            className="px-3.5 py-2 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-colors text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Combo</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 section-padding py-8">
        <div className="container-premium">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search combos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.01]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left text-xs uppercase text-white/50 tracking-wide border-b border-white/10">
                    <th className="px-5 py-3.5">Combo Name</th>
                    <th className="px-5 py-3.5">Price</th>
                    <th className="px-5 py-3.5">Stock</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-white/40 text-sm">
                        Loading combos...
                      </td>
                    </tr>
                  ) : filteredCombos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-white/40 text-sm">
                        No combos found.
                      </td>
                    </tr>
                  ) : (
                    filteredCombos.map((combo: any) => (
                      <tr key={combo.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-white font-medium">{combo.name}</p>
                          <p className="text-white/40 text-xs truncate max-w-xs">{combo.tagline}</p>
                        </td>
                        <td className="px-5 py-4 text-white/80 font-mono text-xs tabular-nums">
                          {formatNaira(combo.totalPrice)}
                        </td>
                        <td className="px-5 py-4 text-white/80 font-mono text-xs tabular-nums">
                          {combo.stockLeft} units
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              combo.isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                                : 'bg-gray-500/15 text-gray-400 border-gray-500/25'
                            }`}
                          >
                            {combo.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {combo.isActive ? 'ACTIVE' : 'HIDDEN'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/combos/${combo.id}`)}
                              className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-xs font-medium flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-primary" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(combo.id, combo.name)}
                              className="p-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-red-400 transition-colors"
                              title="Delete Combo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}