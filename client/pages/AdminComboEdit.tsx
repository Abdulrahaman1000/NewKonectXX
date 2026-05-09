/**
 * Admin Combo Editor — handles BOTH create and edit.
 *
 * Routes:
 *   /admin/combos/new       — creates a new combo
 *   /admin/combos/:id/edit  — edits existing combo
 *
 * Sections (top to bottom):
 *  1. Basic info — name, slug (auto from name), tagline, badge
 *  2. Pricing — totalPrice, originalPrice, stockLeft
 *  3. Visibility — isFeatured, isActive
 *  4. Categories — multi-select chips
 *  5. Items — dynamic list, each with name, badge, individualPrice, multiple images
 *  6. Save / Cancel
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
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

interface ItemForm {
  id?: string;
  name: string;
  badge: string;
  individualPrice: number;
  description: string;
  images: Array<{ url: string; alt?: string }>;
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

const EMPTY_ITEM: ItemForm = {
  name: '',
  badge: '',
  individualPrice: 0,
  description: '',
  images: [],
};

const EMPTY_FORM: FormState = {
  slug: '',
  name: '',
  tagline: '',
  totalPrice: 0,
  originalPrice: 0,
  badge: '',
  stockLeft: 0,
  isFeatured: false,
  isActive: true,
  heroImage: '',
  categorySlugs: [],
  items: [],
};

function slugify(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
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

  // Load existing combo when editing
  const { data: combo, isLoading: loadingCombo } = useQuery({
    queryKey: ['admin-combo', id],
    queryFn: () => getComboAdmin(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (combo) {
      setForm(fromCombo(combo));
      setSlugTouched(true); // Don't auto-regen slug on load
    }
  }, [combo]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // Auto-generate slug from name unless user has manually edited the slug
  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : slugify(name),
    }));
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

  // Item operations
  const addItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  };
  const updateItem = (idx: number, patch: Partial<ItemForm>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  };
  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };
  const addItemImage = (itemIdx: number, url: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx
          ? { ...it, images: [...it.images, { url, alt: it.name }] }
          : it,
      ),
    }));
  };
  const removeItemImage = (itemIdx: number, imgIdx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === itemIdx
          ? { ...it, images: it.images.filter((_, j) => j !== imgIdx) }
          : it,
      ),
    }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.slug.trim()) return 'Slug is required';
    if (form.totalPrice < 0) return 'Total price cannot be negative';
    if (form.originalPrice < 0) return 'Original price cannot be negative';
    if (form.items.length === 0) return 'Add at least one item';
    for (const [i, item] of form.items.entries()) {
      if (!item.name.trim()) return `Item ${i + 1}: name is required`;
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
    if (error) {
      toast.error(error);
      return;
    }
    if (isEdit) updateMut.mutate();
    else createMut.mutate();
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
          <h1 className="text-2xl md:text-3xl font-black text-white">
            {isEdit ? 'Edit combo' : 'New combo'}
          </h1>
          {isEdit && (
            <p className="text-white/50 text-sm mt-1">/{form.slug}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save changes' : 'Create combo'}
        </button>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Section 1: Basic info */}
        <Section title="Basic info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Combo name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={inputCls}
                placeholder="Smart Combo Pack"
              />
            </Field>
            <Field label="Slug (URL)" required>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className={inputCls}
                placeholder="smart-combo-pack"
              />
            </Field>
          </div>
          <Field label="Tagline">
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => update('tagline', e.target.value)}
              className={inputCls}
              placeholder="Style · Tech · Luxury — All In One"
            />
          </Field>
          <Field label="Badge text (optional)">
            <input
              type="text"
              value={form.badge}
              onChange={(e) => update('badge', e.target.value)}
              className={inputCls}
              placeholder="🔥 BEST SELLER"
            />
          </Field>
        </Section>

        {/* Section 2: Pricing */}
        <Section title="Pricing & stock">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Combo price (₦)" required>
              <input
                type="number"
                value={form.totalPrice}
                onChange={(e) => update('totalPrice', parseInt(e.target.value) || 0)}
                className={inputCls}
                min={0}
              />
            </Field>
            <Field label="Original price (₦)">
              <input
                type="number"
                value={form.originalPrice}
                onChange={(e) => update('originalPrice', parseInt(e.target.value) || 0)}
                className={inputCls}
                min={0}
                placeholder="The 'was' price"
              />
            </Field>
            <Field label="Stock available">
              <input
                type="number"
                value={form.stockLeft}
                onChange={(e) => update('stockLeft', parseInt(e.target.value) || 0)}
                className={inputCls}
                min={0}
              />
            </Field>
          </div>
        </Section>

        {/* Section 3: Visibility */}
        <Section title="Visibility">
          <div className="space-y-2">
            <Toggle
              label="Featured (show on homepage hero)"
              hint="Only one combo can be featured at a time."
              checked={form.isFeatured}
              onChange={(v) => update('isFeatured', v)}
            />
            <Toggle
              label="Active"
              hint="Hide from the storefront without deleting."
              checked={form.isActive}
              onChange={(v) => update('isActive', v)}
            />
          </div>
        </Section>

        {/* Section 4: Categories */}
        <Section title="Categories">
          {categories.length === 0 ? (
            <p className="text-xs text-white/40">
              No categories yet.{' '}
              <Link to="/admin/categories" className="text-primary hover:underline">
                Create some →
              </Link>
            </p>
          ) : (
            <>
              <p className="text-xs text-white/40 mb-3">
                Pick all that apply. A combo can show up in multiple category pages.
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const active = form.categorySlugs.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => toggleCategory(cat.slug)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-primary/20 border-primary/40 text-primary'
                          : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white/90'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Section>

        {/* Section 5: Items */}
        <Section title={`Items (${form.items.length})`}>
          <p className="text-xs text-white/40 mb-3">
            Each item is one product included in the combo. Add at least one.
          </p>

          <div className="space-y-4">
            {form.items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/10 p-4"
                style={{ background: 'rgba(255,255,255,0.015)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-widest text-primary/70 font-bold">
                    Item {idx + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <Field label="Item name" required>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                      className={inputCls}
                      placeholder="Smart Watch Pro"
                    />
                  </Field>
                  <Field label="Badge">
                    <input
                      type="text"
                      value={item.badge}
                      onChange={(e) => updateItem(idx, { badge: e.target.value })}
                      className={inputCls}
                      placeholder="SMART WATCH"
                    />
                  </Field>
                </div>

                <Field label="Individual price (₦)">
                  <input
                    type="number"
                    value={item.individualPrice}
                    onChange={(e) =>
                      updateItem(idx, { individualPrice: parseInt(e.target.value) || 0 })
                    }
                    className={inputCls}
                    min={0}
                  />
                </Field>

                <Field label="Description (optional)">
                  <textarea
                    rows={2}
                    value={item.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    className={inputCls}
                  />
                </Field>

                {/* Item images */}
                <div className="mt-4">
                  <p className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
                    Images ({item.images.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {item.images.map((img, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group"
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeItemImage(idx, imgIdx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <ImageUploader
                    value=""
                    onChange={(url) => {
                      if (url) addItemImage(idx, url);
                    }}
                    aspect="square"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-white/15 hover:border-primary/40 text-xs font-bold text-white/60 hover:text-primary flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add item
          </button>
        </Section>

        {/* Bottom save */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            to="/admin/combos"
            className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-xs font-medium text-white/70"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-5 py-2 text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save changes' : 'Create combo'}
          </button>
        </div>
      </div>
    </AdminFrame>
  );
}

// ---- Helpers ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-white/10 p-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <h2 className="text-sm font-black text-white mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-2 -m-2 rounded-lg hover:bg-white/[0.02]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 rounded"
      />
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {hint && <p className="text-[11px] text-white/40">{hint}</p>}
      </div>
    </label>
  );
}
