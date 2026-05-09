/**
 * Admin Testimonials — /admin/testimonials
 *
 * List, add, edit, toggle published, delete.
 * Each testimonial: name, location, rating (1-5), text, isVerified.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import {
  AdminTestimonial,
  createTestimonial,
  deleteTestimonial,
  listTestimonialsAdmin,
  TestimonialPayload,
  updateTestimonial,
} from '@/api/adminTestimonials';
import { toast } from 'sonner';

const EMPTY_FORM: TestimonialPayload = {
  name: '',
  location: '',
  rating: 5,
  text: '',
  isVerified: false,
  isPublished: true,
};

export default function AdminTestimonials() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<TestimonialPayload>(EMPTY_FORM);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: listTestimonialsAdmin,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
    queryClient.invalidateQueries({ queryKey: ['testimonials'] });
  };

  const createMut = useMutation({
    mutationFn: createTestimonial,
    onSuccess: () => {
      toast.success('Testimonial created');
      invalidate();
      setShowCreate(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TestimonialPayload> }) =>
      updateTestimonial(id, payload),
    onSuccess: () => {
      toast.success('Testimonial updated');
      invalidate();
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTestimonial,
    onSuccess: () => { toast.success('Testimonial deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete'),
  });

  const startEdit = (item: AdminTestimonial) => {
    setForm({
      name: item.name,
      location: item.location,
      rating: item.rating,
      text: item.text,
      isVerified: item.isVerified,
      isPublished: item.isPublished,
    });
    setEditingId(item.id);
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('Name required');
    if (!form.location.trim()) return toast.error('Location required');
    if (!form.text.trim()) return toast.error('Review text required');
    if (editingId) updateMut.mutate({ id: editingId, payload: form });
    else createMut.mutate(form);
  };

  const handleToggle = (item: AdminTestimonial) => {
    updateMut.mutate({ id: item.id, payload: { isPublished: !item.isPublished } });
  };

  const handleDelete = (item: AdminTestimonial) => {
    if (confirm(`Delete review by ${item.name}?`)) {
      deleteMut.mutate(item.id);
    }
  };

  const isFormOpen = showCreate || editingId !== null;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <AdminFrame>
      <SEO title="Testimonials — Admin" />

      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Testimonials</h1>
          <p className="text-white/50 text-sm mt-1">{items.length} review{items.length === 1 ? '' : 's'}</p>
        </div>
        {!isFormOpen && (
          <button
            type="button"
            onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            New testimonial
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-2xl border border-primary/30 p-5 mb-6" style={{ background: 'rgba(255,215,0,0.02)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white">{editingId ? 'Edit testimonial' : 'New testimonial'}</h2>
            <button type="button" onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Customer name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="Aisha M."
                />
              </Field>
              <Field label="Location (city)" required>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={inputCls}
                  placeholder="Lagos"
                />
              </Field>
            </div>

            <Field label="Rating">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, rating: n })}
                    className="p-1"
                    aria-label={`Set rating to ${n}`}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        n <= form.rating
                          ? 'fill-primary text-primary'
                          : 'text-white/20'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-white/60 tabular-nums">{form.rating}/5</span>
              </div>
            </Field>

            <Field label="Review text" required>
              <textarea
                rows={4}
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                className={inputCls}
                placeholder="The combo arrived faster than expected and the quality is amazing..."
              />
            </Field>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isVerified ?? false}
                  onChange={(e) => setForm({ ...form, isVerified: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white">Verified buyer (shows a checkmark)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublished ?? true}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white">Published (visible on homepage)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-xs font-medium text-white/70">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {editingId ? 'Save changes' : 'Create testimonial'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p className="mb-4">No testimonials yet.</p>
          {!isFormOpen && (
            <button type="button" onClick={() => setShowCreate(true)} className="text-primary text-sm hover:underline">
              Create your first testimonial →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 p-5 flex flex-col"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < item.rating
                            ? 'fill-primary text-primary'
                            : 'text-white/15'
                        }`}
                      />
                    ))}
                  </div>
                  {item.isVerified && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      VERIFIED
                    </span>
                  )}
                  {!item.isPublished && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-500/15 text-gray-300 border border-gray-500/25">
                      HIDDEN
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={() => handleToggle(item)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white" title={item.isPublished ? 'Hide' : 'Publish'}>
                    {item.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(item)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-white/70 italic leading-relaxed mb-4 flex-1 line-clamp-4">
                "{item.text}"
              </p>

              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-black text-primary">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{item.name}</p>
                  <p className="text-[10px] text-white/40">{item.location}, Nigeria</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminFrame>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-primary/70">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors';
