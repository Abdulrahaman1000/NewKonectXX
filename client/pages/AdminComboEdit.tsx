/**
 * Admin Combo Editor — handles alternatives and colors.
 *
 * For each item:
 *   - Default product (name, price, images, description)
 *   - Alternatives section (variants like "Casio Watch")
 *   - Colors section (Red, Green, Black — with optional hex code)
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Palette,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { SEO } from '@/components/shared/SEO';
import {
  ComboPayload,
  createCombo,
  getComboAdmin,
  updateCombo,
} from '@/api/adminCombos';
import { fetchCategories } from '@/api/categories';
import type { Combo } from '@/types/combo';
import { toast } from 'sonner';

interface AlternativeForm {
  id?: string;
  name: string;
  badge: string;
  description: string;
  images: Array<{ url: string; alt?: string }>;
}

interface ColorForm {
  id?: string;
  name: string;
  hexCode: string;
  imageUrl: string;
}

interface ItemForm {
  id?: string;
  name: string;
  badge: string;
  individualPrice: number;
  description: string;
  images: Array<{ url: string; alt?: string }>;
  alternatives: AlternativeForm[];
  colors: ColorForm[];
}

interface FormState {
  slug: string;
  name: string;
  tagline: string;
  totalPrice: number;
  originalPrice: number;
  badge: string;
  stockLeft: number;
  isFeatured: boolean;
  isActive: boolean;
  heroImage: string;
  categorySlugs: string[];
  items: ItemForm[];
}

const EMPTY_ALT: AlternativeForm = { name: '', badge: '', description: '', images: [] };
const EMPTY_COLOR: ColorForm = { name: '', hexCode: '', imageUrl: '' };
const EMPTY_ITEM: ItemForm = {
  name: '', badge: '', individualPrice: 0, description: '', images: [],
  alternatives: [], colors: [],
};

const EMPTY_FORM: FormState = {
  slug: '', name: '', tagline: '', totalPrice: 0, originalPrice: 0, badge: '',
  stockLeft: 0, isFeatured: false, isActive: true, heroImage: '',
  categorySlugs: [], items: [],
};

function slugify(s: string): string {
  return (s ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

function fromCombo(combo: Combo): FormState {
  return {
    slug: combo.slug,
    name: combo.name,
    tagline: combo.tagline ?? '',
    totalPrice: combo.totalPrice,
    originalPrice: combo.originalPrice,
    badge: combo.badge ?? '',
    stockLeft: combo.stockLeft,
    isFeatured: combo.isFeatured,
    isActive: combo.isActive,
    heroImage: combo.heroImage ?? '',
    categorySlugs: combo.categorySlugs ?? [],
    items: (combo.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      badge: item.badge ?? '',
      individualPrice: item.individualPrice,
      description: item.description ?? '',
      images: item.images ?? [],
      alternatives: (item.alternatives ?? []).map((alt) => ({
        id: alt.id,
        name: alt.name,
        badge: alt.badge ?? '',
        description: alt.description ?? '',
        images: alt.images ?? [],
      })),
      colors: (item.colors ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        hexCode: c.hexCode ?? '',
        imageUrl: c.imageUrl ?? '',
      })),
    })),
  };
}

export default function AdminComboEdit() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [expandedAlts, setExpandedAlts] = useState<Set<number>>(new Set());
  const [expandedColors, setExpandedColors] = useState<Set<number>>(new Set());

  const { data: combo, isLoading: loadingCombo } = useQuery({
    queryKey: ['admin-combo', id],
    queryFn: () => getComboAdmin(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (combo) {
      setForm(fromCombo(combo));
      setSlugTouched(true);
    }
  }, [combo]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  };
  const handleSlugChange = (slug: string) => {
    setForm((f) => ({ ...f, slug: slugify(slug) }));
    setSlugTouched(true);
  };
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleCategory = (slug: string) => {
    setForm((f) => ({
      ...f,
      categorySlugs: f.categorySlugs.includes(slug)
        ? f.categorySlugs.filter((s) => s !== slug)
        : [...f.categorySlugs, slug],
    }));
  };

  // Item ops
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const updateItem = (idx: number, patch: Partial<ItemForm>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const addItemImage = (itemIdx: number, url: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx ? { ...it, images: [...it.images, { url, alt: it.name }] } : it,
      ),
    }));
  };
  const removeItemImage = (itemIdx: number, imgIdx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx ? { ...it, images: it.images.filter((_, j) => j !== imgIdx) } : it,
      ),
    }));
  };

  // Alternative ops
  const addAlternative = (itemIdx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx ? { ...it, alternatives: [...it.alternatives, { ...EMPTY_ALT }] } : it,
      ),
    }));
    setExpandedAlts((s) => new Set(s).add(itemIdx));
  };
  const updateAlternative = (itemIdx: number, altIdx: number, patch: Partial<AlternativeForm>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx
          ? { ...it, alternatives: it.alternatives.map((a, j) => (j === altIdx ? { ...a, ...patch } : a)) }
          : it,
      ),
    }));
  };
  const removeAlternative = (itemIdx: number, altIdx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx ? { ...it, alternatives: it.alternatives.filter((_, j) => j !== altIdx) } : it,
      ),
    }));
  };
  const addAlternativeImage = (itemIdx: number, altIdx: number, url: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx
          ? {
              ...it,
              alternatives: it.alternatives.map((a, j) =>
                j === altIdx ? { ...a, images: [...a.images, { url, alt: a.name }] } : a,
              ),
            }
          : it,
      ),
    }));
  };
  const removeAlternativeImage = (itemIdx: number, altIdx: number, imgIdx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx
          ? {
              ...it,
              alternatives: it.alternatives.map((a, j) =>
                j === altIdx ? { ...a, images: a.images.filter((_, k) => k !== imgIdx) } : a,
              ),
            }
          : it,
      ),
    }));
  };

  // Color ops
  const addColor = (itemIdx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx ? { ...it, colors: [...it.colors, { ...EMPTY_COLOR }] } : it,
      ),
    }));
    setExpandedColors((s) => new Set(s).add(itemIdx));
  };
  const updateColor = (itemIdx: number, colorIdx: number, patch: Partial<ColorForm>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx
          ? { ...it, colors: it.colors.map((c, j) => (j === colorIdx ? { ...c, ...patch } : c)) }
          : it,
      ),
    }));
  };
  const removeColor = (itemIdx: number, colorIdx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx ? { ...it, colors: it.colors.filter((_, j) => j !== colorIdx) } : it,
      ),
    }));
  };

  const toggleAlts = (itemIdx: number) => {
    setExpandedAlts((s) => {
      const next = new Set(s);
      if (next.has(itemIdx)) next.delete(itemIdx); else next.add(itemIdx);
      return next;
    });
  };
  const toggleColors = (itemIdx: number) => {
    setExpandedColors((s) => {
      const next = new Set(s);
      if (next.has(itemIdx)) next.delete(itemIdx); else next.add(itemIdx);
      return next;
    });
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.slug.trim()) return 'Slug is required';
    if (form.totalPrice < 0) return 'Total price cannot be negative';
    if (form.originalPrice < 0) return 'Original price cannot be negative';
    if (form.items.length === 0) return 'Add at least one item';
    for (const [i, item] of form.items.entries()) {
      if (!item.name.trim()) return `Item ${i + 1}: name is required`;
      for (const [j, alt] of item.alternatives.entries()) {
        if (!alt.name.trim()) return `Item ${i + 1} alternative ${j + 1}: name is required`;
      }
      for (const [j, color] of item.colors.entries()) {
        if (!color.name.trim()) return `Item ${i + 1} color ${j + 1}: name is required`;
      }
    }
    return null;
  };

  const buildPayload = (): ComboPayload => ({
    slug: form.slug,
    name: form.name.trim(),
    tagline: form.tagline.trim(),
    totalPrice: form.totalPrice,
    originalPrice: form.originalPrice,
    badge: form.badge.trim(),
    stockLeft: form.stockLeft,
    isFeatured: form.isFeatured,
    isActive: form.isActive,
    heroImage: form.heroImage.trim(),
    categorySlugs: form.categorySlugs,
    items: form.items.map((it) => ({
      id: it.id,
      name: it.name.trim(),
      badge: it.badge.trim(),
      individualPrice: it.individualPrice,
      description: it.description.trim(),
      images: it.images,
      alternatives: it.alternatives.map((a) => ({
        id: a.id,
        name: a.name.trim(),
        badge: a.badge.trim(),
        description: a.description.trim(),
        images: a.images,
      })),
      colors: it.colors.map((c) => ({
        id: c.id,
        name: c.name.trim(),
        hexCode: c.hexCode.trim(),
        imageUrl: c.imageUrl.trim(),
      })),
    })),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-combos'] });
    queryClient.invalidateQueries({ queryKey: ['combos'] });
    queryClient.invalidateQueries({ queryKey: ['featuredCombo'] });
  };

  const createMut = useMutation({
    mutationFn: () => createCombo(buildPayload()),
    onSuccess: () => {
      toast.success('Combo created');
      invalidate();
      navigate('/admin/combos');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: () => updateCombo(id!, buildPayload()),
    onSuccess: () => {
      toast.success('Combo updated');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['admin-combo', id] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update'),
  });

  const handleSave = () => {
    const error = validate();
    if (error) { toast.error(error); return; }
    if (isEdit) updateMut.mutate(); else createMut.mutate();
  };

  const saving = createMut.isPending || updateMut.isPending;

  if (isEdit && loadingCombo) {
    return (
      <AdminFrame>
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      </AdminFrame>
    );
  }

  return (
    <AdminFrame>
      <SEO title={isEdit ? `Edit ${form.name || 'Combo'} — Admin` : 'New Combo — Admin'} />

      <Link to="/admin/combos" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to combos
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">{isEdit ? 'Edit combo' : 'New combo'}</h1>
          {isEdit && <p className="text-white/50 text-sm mt-1">/{form.slug}</p>}
        </div>
        <button type="button" onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save changes' : 'Create combo'}
        </button>
      </div>

      <div className="space-y-6 max-w-4xl">
        <Section title="Basic info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Combo name" required>
              <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                className={inputCls} placeholder="Smart Combo Pack" />
            </Field>
            <Field label="Slug (URL)" required>
              <input type="text" value={form.slug} onChange={(e) => handleSlugChange(e.target.value)}
                className={inputCls} placeholder="smart-combo-pack" />
            </Field>
          </div>
          <Field label="Tagline">
            <input type="text" value={form.tagline} onChange={(e) => update('tagline', e.target.value)}
              className={inputCls} placeholder="Style · Tech · Luxury — All In One" />
          </Field>
          <Field label="Badge text (optional)">
            <input type="text" value={form.badge} onChange={(e) => update('badge', e.target.value)}
              className={inputCls} placeholder="🔥 BEST SELLER" />
          </Field>
        </Section>

        <Section title="Pricing & stock">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Combo price (₦)" required>
              <input type="number" value={form.totalPrice}
                onChange={(e) => update('totalPrice', parseInt(e.target.value) || 0)} className={inputCls} min={0} />
            </Field>
            <Field label="Original price (₦)">
              <input type="number" value={form.originalPrice}
                onChange={(e) => update('originalPrice', parseInt(e.target.value) || 0)} className={inputCls} min={0} />
            </Field>
            <Field label="Stock available">
              <input type="number" value={form.stockLeft}
                onChange={(e) => update('stockLeft', parseInt(e.target.value) || 0)} className={inputCls} min={0} />
            </Field>
          </div>
        </Section>

        <Section title="Visibility">
          <div className="space-y-2">
            <Toggle label="Featured (show on homepage hero)" hint="Only one combo can be featured at a time."
              checked={form.isFeatured} onChange={(v) => update('isFeatured', v)} />
            <Toggle label="Active" hint="Hide from the storefront without deleting."
              checked={form.isActive} onChange={(v) => update('isActive', v)} />
          </div>
        </Section>

        <Section title="Categories">
          {categories.length === 0 ? (
            <p className="text-xs text-white/40">
              No categories yet.{' '}
              <Link to="/admin/categories" className="text-primary hover:underline">Create some →</Link>
            </p>
          ) : (
            <>
              <p className="text-xs text-white/40 mb-3">Pick all that apply.</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const active = form.categorySlugs.includes(cat.slug);
                  return (
                    <button key={cat.slug} type="button" onClick={() => toggleCategory(cat.slug)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        active ? 'bg-primary/20 border-primary/40 text-primary'
                        : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white/90'}`}>
                      <span>{cat.icon}</span><span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Section>

        <Section title={`Items (${form.items.length})`}>
          <p className="text-xs text-white/40 mb-3">
            Each item is one slot. Add alternatives (variants) and colors per item.
          </p>

          <div className="space-y-4">
            {form.items.map((item, idx) => {
              const altsExpanded = expandedAlts.has(idx);
              const colorsExpanded = expandedColors.has(idx);
              return (
                <div key={idx} className="rounded-xl border border-white/10 p-4"
                  style={{ background: 'rgba(255,255,255,0.015)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-widest text-primary/70 font-bold">
                      Item {idx + 1} (Default)
                    </p>
                    <button type="button" onClick={() => removeItem(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <Field label="Item name" required>
                      <input type="text" value={item.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                        className={inputCls} placeholder="Smart Watch Pro" />
                    </Field>
                    <Field label="Badge">
                      <input type="text" value={item.badge}
                        onChange={(e) => updateItem(idx, { badge: e.target.value })}
                        className={inputCls} placeholder="SMART WATCH" />
                    </Field>
                  </div>

                  <Field label="Individual price (₦)">
                    <input type="number" value={item.individualPrice}
                      onChange={(e) => updateItem(idx, { individualPrice: parseInt(e.target.value) || 0 })}
                      className={inputCls} min={0} />
                  </Field>

                  <Field label="Description (optional)">
                    <textarea rows={2} value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })} className={inputCls} />
                  </Field>

                  <div className="mt-4">
                    <p className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
                      Images ({item.images.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                      {item.images.map((img, imgIdx) => (
                        <div key={imgIdx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeItemImage(idx, imgIdx)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <ImageUploader value="" onChange={(url) => { if (url) addItemImage(idx, url); }} aspect="square" />
                  </div>

                  {/* Alternatives */}
                  <div className="mt-6 pt-5 border-t border-white/5">
                    <button type="button" onClick={() => toggleAlts(idx)}
                      className="w-full flex items-center justify-between text-left mb-3 group">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-emerald-300/80 font-bold">
                          Alternatives ({item.alternatives.length})
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          Variants customers can swap in at the same combo price
                        </p>
                      </div>
                      {altsExpanded
                        ? <ChevronUp className="w-4 h-4 text-white/50 group-hover:text-white" />
                        : <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white" />}
                    </button>

                    {altsExpanded && (
                      <div className="space-y-3 mt-3">
                        {item.alternatives.map((alt, altIdx) => (
                          <div key={altIdx} className="rounded-lg border border-emerald-500/15 p-3"
                            style={{ background: 'rgba(16,185,129,0.02)' }}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] uppercase tracking-wider text-emerald-300/70 font-bold">
                                Alternative {altIdx + 1}
                              </p>
                              <button type="button" onClick={() => removeAlternative(idx, altIdx)}
                                className="p-1 rounded-md hover:bg-red-500/10 text-white/40 hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                              <Field label="Variant name" required>
                                <input type="text" value={alt.name}
                                  onChange={(e) => updateAlternative(idx, altIdx, { name: e.target.value })}
                                  className={inputCls} placeholder="Casio Watch" />
                              </Field>
                              <Field label="Badge">
                                <input type="text" value={alt.badge}
                                  onChange={(e) => updateAlternative(idx, altIdx, { badge: e.target.value })}
                                  className={inputCls} placeholder="CLASSIC" />
                              </Field>
                            </div>

                            <Field label="Description (optional)">
                              <textarea rows={2} value={alt.description}
                                onChange={(e) => updateAlternative(idx, altIdx, { description: e.target.value })}
                                className={inputCls} />
                            </Field>

                            <div className="mt-3">
                              <p className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
                                Images ({alt.images.length})
                              </p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                                {alt.images.map((img, imgIdx) => (
                                  <div key={imgIdx} className="relative aspect-square rounded-md overflow-hidden border border-white/10 group">
                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removeAlternativeImage(idx, altIdx, imgIdx)}
                                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <ImageUploader value=""
                                onChange={(url) => { if (url) addAlternativeImage(idx, altIdx, url); }}
                                aspect="square" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button type="button" onClick={() => addAlternative(idx)}
                      className="mt-3 w-full py-2 rounded-lg border border-dashed border-emerald-500/25 hover:border-emerald-500/50 text-[11px] font-bold text-emerald-300/70 hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors">
                      <Plus className="w-3 h-3" />
                      Add alternative for this slot
                    </button>
                  </div>

                  {/* Colors */}
                  <div className="mt-6 pt-5 border-t border-white/5">
                    <button type="button" onClick={() => toggleColors(idx)}
                      className="w-full flex items-center justify-between text-left mb-3 group">
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-pink-300/70" />
                        <div>
                          <p className="text-xs uppercase tracking-widest text-pink-300/80 font-bold">
                            Colors ({item.colors.length})
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            Color options customers can pick (e.g. Red, Green, Black)
                          </p>
                        </div>
                      </div>
                      {colorsExpanded
                        ? <ChevronUp className="w-4 h-4 text-white/50 group-hover:text-white" />
                        : <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white" />}
                    </button>

                    {colorsExpanded && (
                      <div className="space-y-2 mt-3">
                        {item.colors.map((color, colorIdx) => (
                          <div key={colorIdx} className="rounded-lg border border-pink-500/15 p-3 flex items-start gap-3"
                            style={{ background: 'rgba(236,72,153,0.02)' }}>
                            {/* Swatch preview */}
                            <div className="flex-shrink-0">
                              {color.hexCode ? (
                                <div className="w-10 h-10 rounded-full border-2 border-white/20"
                                  style={{ background: color.hexCode || '#888' }} />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] text-white/40">
                                  ?
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Field label="Color name" required>
                                  <input type="text" value={color.name}
                                    onChange={(e) => updateColor(idx, colorIdx, { name: e.target.value })}
                                    className={inputCls} placeholder="Red" />
                                </Field>
                                <Field label="Hex code (optional)" hint="For a color dot. Leave empty for label only.">
                                  <input type="text" value={color.hexCode}
                                    onChange={(e) => updateColor(idx, colorIdx, { hexCode: e.target.value })}
                                    className={inputCls} placeholder="#ff0000" />
                                </Field>
                              </div>
                            </div>

                            <button type="button" onClick={() => removeColor(idx, colorIdx)}
                              className="p-1 rounded-md hover:bg-red-500/10 text-white/40 hover:text-red-400 flex-shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button type="button" onClick={() => addColor(idx)}
                      className="mt-3 w-full py-2 rounded-lg border border-dashed border-pink-500/25 hover:border-pink-500/50 text-[11px] font-bold text-pink-300/70 hover:text-pink-300 flex items-center justify-center gap-1.5 transition-colors">
                      <Plus className="w-3 h-3" />
                      Add color for this slot
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={addItem}
            className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-white/15 hover:border-primary/40 text-xs font-bold text-white/60 hover:text-primary flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />
            Add item
          </button>
        </Section>

        <div className="flex justify-end gap-3 pt-4">
          <Link to="/admin/combos"
            className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-xs font-medium text-white/70">
            Cancel
          </Link>
          <button type="button" onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2 px-5 py-2 text-sm font-bold disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save changes' : 'Create combo'}
          </button>
        </div>
      </div>
    </AdminFrame>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <h2 className="text-sm font-black text-white mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-primary/70">*</span>}
      </span>
      {children}
      {hint && <p className="text-[10px] text-white/40 mt-1">{hint}</p>}
    </label>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors';

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-2 -m-2 rounded-lg hover:bg-white/[0.02]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 mt-0.5 rounded" />
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {hint && <p className="text-[11px] text-white/40">{hint}</p>}
      </div>
    </label>
  );
}
