/**
 * Admin FAQs — /admin/faqs
 *
 * List, add, edit, reorder, toggle visibility, delete.
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
import { SEO } from '@/components/shared/SEO';
import {
  AdminFaq,
  createFaq,
  deleteFaq,
  FaqPayload,
  listFaqsAdmin,
  reorderFaqs,
  updateFaq,
} from '@/api/adminFaqs';
import { toast } from 'sonner';

const EMPTY_FORM: FaqPayload = {
  question: '',
  answer: '',
  isPublished: true,
};

export default function AdminFaqs() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FaqPayload>(EMPTY_FORM);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: listFaqsAdmin,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
    queryClient.invalidateQueries({ queryKey: ['faqs'] });
  };

  const createMut = useMutation({
    mutationFn: createFaq,
    onSuccess: () => {
      toast.success('FAQ created');
      invalidate();
      setShowCreate(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FaqPayload> }) =>
      updateFaq(id, payload),
    onSuccess: () => {
      toast.success('FAQ updated');
      invalidate();
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => { toast.success('FAQ deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete'),
  });

  const reorderMut = useMutation({
    mutationFn: reorderFaqs,
    onSuccess: () => invalidate(),
    onError: () => toast.error('Failed to reorder'),
  });

  const startEdit = (faq: AdminFaq) => {
    setForm({
      question: faq.question,
      answer: faq.answer,
      isPublished: faq.isPublished,
    });
    setEditingId(faq.id);
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.question.trim()) return toast.error('Question required');
    if (!form.answer.trim()) return toast.error('Answer required');
    if (editingId) updateMut.mutate({ id: editingId, payload: form });
    else createMut.mutate(form);
  };

  const handleToggle = (faq: AdminFaq) => {
    updateMut.mutate({ id: faq.id, payload: { isPublished: !faq.isPublished } });
  };

  const handleDelete = (faq: AdminFaq) => {
    if (confirm(`Delete this FAQ?\n\n"${faq.question}"`)) {
      deleteMut.mutate(faq.id);
    }
  };

  const move = (idx: number, direction: -1 | 1) => {
    const newOrder = [...faqs];
    const target = idx + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    reorderMut.mutate(newOrder.map((f) => f.id));
  };

  const isFormOpen = showCreate || editingId !== null;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <AdminFrame>
      <SEO title="FAQs — Admin" />

      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">FAQs</h1>
          <p className="text-white/50 text-sm mt-1">{faqs.length} entr{faqs.length === 1 ? 'y' : 'ies'}</p>
        </div>
        {!isFormOpen && (
          <button
            type="button"
            onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            New FAQ
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-2xl border border-primary/30 p-5 mb-6" style={{ background: 'rgba(255,215,0,0.02)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white">{editingId ? 'Edit FAQ' : 'New FAQ'}</h2>
            <button type="button" onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <Field label="Question" required>
              <input
                type="text"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className={inputCls}
                placeholder="How long does shipping take?"
              />
            </Field>
            <Field label="Answer" required>
              <textarea
                rows={4}
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                className={inputCls}
                placeholder="Standard delivery takes 1-3 business days within Lagos and 3-5 days for other states."
              />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished ?? true}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-white">Published (visible on FAQ page)</span>
            </label>
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
              {editingId ? 'Save changes' : 'Create FAQ'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p className="mb-4">No FAQs yet.</p>
          {!isFormOpen && (
            <button type="button" onClick={() => setShowCreate(true)} className="text-primary text-sm hover:underline">
              Create your first FAQ →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={faq.id} className="rounded-xl border border-white/10 p-4 flex items-start gap-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || reorderMut.isPending}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === faqs.length - 1 || reorderMut.isPending}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">{faq.question}</h3>
                  {!faq.isPublished && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-500/15 text-gray-300 border border-gray-500/25">
                      HIDDEN
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 line-clamp-2">{faq.answer}</p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => handleToggle(faq)} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white" title={faq.isPublished ? 'Hide' : 'Publish'}>
                  {faq.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button type="button" onClick={() => startEdit(faq)} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDelete(faq)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400">
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

const inputCls = 'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors';
