/**
 * Admin Categories management — /admin/categories
 *
 * List, create, edit, delete (soft) categories.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  createCategory,
  deleteCategory,
  listCategoriesAdmin,
  updateCategory,
} from '@/api/categories';
import { useAuth } from '@/contexts/AuthContext';
import type { Category } from '@/types/category';
import { SEO } from '@/components/shared/SEO';
import { toast } from 'sonner';

interface FormState {
  slug: string;
  name: string;
  icon: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  slug: '',
  name: '',
  icon: '',
  description: '',
  displayOrder: 0,
  isActive: true,
};

export default function AdminCategories() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: listCategoriesAdmin,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const createMut = useMutation({
    mutationFn: () => createCategory(form),
    onSuccess: () => {
      toast.success('Category created');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FormState> }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      toast.success('Category updated');
      setEditingId(null);
      invalidate();
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Category removed');
      invalidate();
    },
    onError: () => toast.error('Failed to delete'),
  });

  const startEdit = (cat: Category) => {
    setEditingId(cat.id ?? cat._id ?? '');
    setForm({
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      description: cat.description,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
    });
    setShowCreate(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowCreate(true);
  };

  const cancel = () => {
    setEditingId(null);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Categories — Admin" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/95 backdrop-blur">
        <div className="container-premium flex items-center justify-between py-3">
          <Link to="/admin" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-[0_0_16px_rgba(255,215,0,0.3)] group-hover:scale-105 transition-transform">
              <span className="text-black font-black text-sm">SC</span>
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">Smart Combo</p>
              <p className="text-[10px] uppercase tracking-widest text-primary/70 font-bold leading-tight">Admin</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:inline text-xs text-white/50 hover:text-white/80">View store</Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300 transition-colors text-xs font-medium text-white/70"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 section-padding py-10">
        <div className="container-premium max-w-4xl">
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
            <ArrowLeft className="w-3 h-3" />
            Back to dashboard
          </Link>

          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Categories</h1>
              <p className="text-white/50 text-sm mt-1">{categories.length} total</p>
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              New category
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <CategoryForm
              title="Create category"
              form={form}
              setForm={setForm}
              onSave={() => createMut.mutate()}
              onCancel={cancel}
              saving={createMut.isPending}
            />
          )}

          {/* List */}
          {isLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : categories.length === 0 && !showCreate ? (
            <p className="text-center text-white/40 py-12">No categories yet.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const id = cat.id ?? cat._id ?? '';
                const isEditing = editingId === id;

                if (isEditing) {
                  return (
                    <CategoryForm
                      key={id}
                      title="Edit category"
                      form={form}
                      setForm={setForm}
                      onSave={() => updateMut.mutate({ id, payload: form })}
                      onCancel={cancel}
                      saving={updateMut.isPending}
                    />
                  );
                }

                return (
                  <div
                    key={id}
                    className="rounded-xl border border-white/10 p-4 flex items-center gap-4"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="text-2xl">{cat.icon || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white">{cat.name}</p>
                        <span className="text-[10px] text-white/40 font-mono">{cat.slug}</span>
                        {!cat.isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-500/15 text-gray-400 border border-gray-500/25">
                            HIDDEN
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-white/50 mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"
                        aria-label="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hide "${cat.name}"? Combos using it will be untagged.`)) {
                            deleteMut.mutate(id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-8 text-xs text-white/30 text-center">
            Logged in as {user?.email}
          </p>
        </div>
      </main>
    </div>
  );
}

function CategoryForm({
  title,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-primary/30 p-5 mb-4"
      style={{ background: 'rgba(255,215,0,0.02)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-primary">{title}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-white/50 hover:text-white"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Slug (URL-friendly)" required>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            className={inputCls}
            placeholder="mens-fashion"
          />
        </Field>
        <Field label="Display name" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
            placeholder="Men's Fashion"
          />
        </Field>
        <Field label="Icon (emoji)">
          <input
            type="text"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            className={inputCls}
            placeholder="👔"
            maxLength={4}
          />
        </Field>
        <Field label="Display order">
          <input
            type="number"
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputCls}
          placeholder="Style essentials for the modern man"
        />
      </Field>

      <label className="flex items-center gap-2 mt-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <span className="text-xs text-white/70">Active (visible on storefront)</span>
      </label>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.slug || !form.name}
          className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary px-4 py-2 text-xs"
        >
          Cancel
        </button>
      </div>
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
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30';
