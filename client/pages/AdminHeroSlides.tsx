/**
 * Admin Hero Slides — /admin/hero-slides
 * Uses the existing HeroSlide schema field names (tag, subtitle, accent, etc.)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { SEO } from '@/components/shared/SEO';
import {
  AdminHeroSlide,
  createHeroSlide,
  deleteHeroSlide,
  HeroSlidePayload,
  listHeroSlidesAdmin,
  reorderHeroSlides,
  updateHeroSlide,
} from '@/api/adminHeroSlides';
import { toast } from 'sonner';

const ACCENT_PRESETS = [
  { name: 'Indigo Night',  value: 'from-[#1a0a2e] via-[#16213e] to-[#0f3460]' },
  { name: 'Royal Violet',  value: 'from-[#0f0c29] via-[#302b63] to-[#24243e]' },
  { name: 'Deep Sapphire', value: 'from-[#0d1b2a] via-[#1b2838] to-[#2d1b69]' },
  { name: 'Midnight Gold', value: 'from-[#0a0a1a] via-[#1a1040] to-[#0f2040]' },
  { name: 'Warm Bronze',   value: 'from-[#1a0f0a] via-[#2a1a10] to-[#3d2010]' },
  { name: 'Rose Plum',     value: 'from-[#1a0a0f] via-[#251020] to-[#1a0a2e]' },
];

const EMPTY_FORM: HeroSlidePayload = {
  desktopImage: '',
  tag: '',
  headline: '',
  subtitle: '',
  buttonText: '',
  buttonLink: '',
  accent: ACCENT_PRESETS[0].value,
  isActive: true,
};

export default function AdminHeroSlides() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<HeroSlidePayload>(EMPTY_FORM);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['admin-hero-slides'],
    queryFn: listHeroSlidesAdmin,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] });
    queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
  };

  const createMut = useMutation({
    mutationFn: (payload: HeroSlidePayload) => createHeroSlide(payload),
    onSuccess: () => {
      toast.success('Slide created');
      invalidate();
      setShowCreate(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<HeroSlidePayload> }) =>
      updateHeroSlide(id, payload),
    onSuccess: () => {
      toast.success('Slide updated');
      invalidate();
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteHeroSlide,
    onSuccess: () => {
      toast.success('Slide deleted');
      invalidate();
    },
    onError: () => toast.error('Failed to delete slide'),
  });

  const reorderMut = useMutation({
    mutationFn: reorderHeroSlides,
    onSuccess: () => invalidate(),
    onError: () => toast.error('Failed to reorder'),
  });

  const startEdit = (slide: AdminHeroSlide) => {
    setForm({
      desktopImage: slide.desktopImage ?? '',
      mobileImage: slide.mobileImage ?? '',
      tag: slide.tag ?? '',
      headline: slide.headline ?? '',
      subtitle: slide.subtitle ?? '',
      buttonText: slide.buttonText ?? '',
      buttonLink: slide.buttonLink ?? '',
      accent: slide.accent ?? ACCENT_PRESETS[0].value,
      isActive: slide.isActive,
    });
    setEditingId(slide.id);
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.desktopImage?.trim()) {
      toast.error('Image is required');
      return;
    }
    if (!form.tag?.trim() && !form.headline?.trim()) {
      toast.error('Tag or headline is required');
      return;
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, payload: form });
    } else {
      createMut.mutate(form);
    }
  };

  const handleToggleActive = (slide: AdminHeroSlide) => {
    updateMut.mutate({
      id: slide.id,
      payload: { isActive: !slide.isActive },
    });
  };

  const handleDelete = (slide: AdminHeroSlide) => {
    if (confirm(`Delete "${slide.tag || slide.headline || 'this slide'}"? This cannot be undone.`)) {
      deleteMut.mutate(slide.id);
    }
  };

  const move = (idx: number, direction: -1 | 1) => {
    const newOrder = [...slides];
    const target = idx + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    reorderMut.mutate(newOrder.map((s) => s.id));
  };

  const isFormOpen = showCreate || editingId !== null;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <AdminFrame>
      <SEO title="Hero Slides — Admin" />

      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Hero Slides</h1>
          <p className="text-white/50 text-sm mt-1">{slides.length} slide{slides.length === 1 ? '' : 's'} · Homepage carousel</p>
        </div>
        {!isFormOpen && (
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setForm(EMPTY_FORM);
            }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            New slide
          </button>
        )}
      </div>

      {/* Editor */}
      {isFormOpen && (
        <div
          className="rounded-2xl border border-primary/30 p-5 mb-6"
          style={{ background: 'rgba(255,215,0,0.02)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white">
              {editingId ? 'Edit slide' : 'New slide'}
            </h2>
            <button
              type="button"
              onClick={cancelEdit}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
            <div className="space-y-3">
              <Field label="Tag (e.g. 'See the World Differently')" required>
                <input
                  type="text"
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className={inputCls}
                  placeholder="See the World Differently"
                />
              </Field>
              <Field label="Headline">
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  className={inputCls}
                  placeholder="Style · Tech · Luxury"
                />
              </Field>
              <Field label="Subtitle">
                <textarea
                  rows={2}
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className={inputCls}
                  placeholder="Premium glasses with style and clarity"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Button text">
                  <input
                    type="text"
                    value={form.buttonText}
                    onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                    className={inputCls}
                    placeholder="Shop now"
                  />
                </Field>
                <Field label="Button link">
                  <input
                    type="text"
                    value={form.buttonLink}
                    onChange={(e) => setForm({ ...form, buttonLink: e.target.value })}
                    className={inputCls}
                    placeholder="/products"
                  />
                </Field>
              </div>
              <Field label="Background gradient">
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setForm({ ...form, accent: g.value })}
                      className={`relative h-12 w-24 rounded-lg overflow-hidden border-2 transition-all ${
                        form.accent === g.value
                          ? 'border-primary scale-105'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${g.value}`} />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90 px-1 text-center">
                        {g.name}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white">Visible on homepage</span>
              </label>
            </div>

            <div>
              <p className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
                Slide image <span className="text-primary/70">*</span>
              </p>
              <ImageUploader
                value={form.desktopImage}
                onChange={(url) => setForm({ ...form, desktopImage: url })}
                aspect="square"
              />
              <p className="text-[10px] text-white/40 mt-2">
                Recommended: 1200×800 or larger
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-xs font-medium text-white/70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {editingId ? 'Save changes' : 'Create slide'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : slides.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p className="mb-4">No hero slides yet.</p>
          {!isFormOpen && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-primary text-sm hover:underline"
            >
              Create your first slide →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className="rounded-xl border border-white/10 p-4 flex items-start gap-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || reorderMut.isPending}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === slides.length - 1 || reorderMut.isPending}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                  aria-label="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {slide.desktopImage ? (
                <img
                  src={slide.desktopImage}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover border border-white/10 flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-white/30 flex-shrink-0">
                  No image
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white truncate">
                    {slide.tag || slide.headline || 'Untitled'}
                  </h3>
                  {!slide.isActive && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-500/15 text-gray-300 border border-gray-500/25">
                      HIDDEN
                    </span>
                  )}
                </div>
                {slide.headline && slide.tag && (
                  <p className="text-xs text-white/60 truncate">{slide.headline}</p>
                )}
                {slide.subtitle && (
                  <p className="text-[11px] text-white/40 line-clamp-1 mt-0.5">{slide.subtitle}</p>
                )}
                {(slide.buttonText || slide.buttonLink) && (
                  <p className="text-[10px] text-primary/70 mt-1 truncate">
                    Button: "{slide.buttonText}" → {slide.buttonLink}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActive(slide)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"
                  aria-label={slide.isActive ? 'Hide' : 'Show'}
                  title={slide.isActive ? 'Hide from carousel' : 'Show in carousel'}
                >
                  {slide.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(slide)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"
                  aria-label="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(slide)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors';
