/**
 * Admin Partner Ads — /admin/ads  (Destination: client/pages/AdminAds.tsx)
 * Upload images / short videos and write captions that approved partners can download and post.
 * Use {{LINK}} in a caption: each partner sees their own referral link there.
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useDialogs } from '@/components/shared/ConfirmProvider';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import { AdminAd, createAd, deleteAd, listAds, updateAd } from '@/api/adminAds';
import { CLOUDINARY_CONFIG } from '@/lib/cloudinary';

const MAX_MB = 50;
const input = 'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30';
const label = 'block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1';

/**
 * Uploads an image OR video straight from the browser to Cloudinary (same unsigned preset the
 * rest of the site uses). The existing helper only does images, so this uses the "auto" endpoint.
 */
function uploadMedia(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    fd.append('folder', `${CLOUDINARY_CONFIG.folder}/ads`);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      try {
        const r = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(r.secure_url);
        else reject(new Error(r?.error?.message || 'Upload failed'));
      } catch {
        reject(new Error('Invalid response from Cloudinary'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error while uploading')));
    xhr.send(fd);
  });
}

function NewAdForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ title: '', product: '', url: '', whatsappCaption: '', instagramCaption: '', tiktokCaption: '' });
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: async () => {
      setPct(0);
      const url = file ? await uploadMedia(file, setPct) : f.url;
      return createAd({ ...f, url });
    },
    onSuccess: () => { toast.success('Ad saved'); onDone(); },
    onError: (e: any) => toast.error(e?.message || 'Could not save the ad'),
  });

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    if (picked && picked.size > MAX_MB * 1024 * 1024) {
      toast.error(`That file is over ${MAX_MB} MB. Compress it or paste a link instead.`);
      e.target.value = '';
      return;
    }
    setFile(picked);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="rounded-xl border border-white/10 p-4 mb-6 space-y-3"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">New ad</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <div><label className={label}>Title *</label><input className={input} value={f.title} onChange={set('title')} maxLength={120} required placeholder="e.g. Smart Watch + Earpods combo" /></div>
        <div><label className={label}>Product / combo</label><input className={input} value={f.product} onChange={set('product')} maxLength={120} placeholder="Shown as a label to partners" /></div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className={label}>Image or video (max {MAX_MB} MB)</label>
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={pick} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/10 text-white/70 hover:border-primary/40">
            <Upload className="w-4 h-4" /> {file ? file.name : 'Choose file'}
          </button>
        </div>
        <div><label className={label}>…or paste a link (https)</label><input className={input} value={f.url} onChange={set('url')} placeholder="https://res.cloudinary.com/…" disabled={!!file} /></div>
      </div>

      <p className="text-[11px] text-white/40">Captions are optional. Type <b>{'{{LINK}}'}</b> where the partner's own link should go.</p>
      {([
        ['whatsappCaption', 'WhatsApp caption'],
        ['instagramCaption', 'Instagram caption'],
        ['tiktokCaption', 'TikTok caption'],
      ] as const).map(([k, l]) => (
        <div key={k}>
          <label className={label}>{l}</label>
          <textarea className={input} rows={3} value={f[k]} onChange={set(k)} maxLength={2200} placeholder="🔥 Smart gadgets at the best price. Order here: {{LINK}}" />
        </div>
      ))}

      <button disabled={mut.isPending} className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold disabled:opacity-50">
        {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        {mut.isPending ? (file && pct < 100 ? `Uploading ${pct}%` : 'Saving…') : 'Save ad'}
      </button>
    </form>
  );
}

/** Edit text only (title, label, captions). To change the picture or video, delete the ad and add it again. */
function EditAdModal({ ad, onClose, onSaved }: { ad: AdminAd; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: ad.title,
    product: ad.product,
    whatsappCaption: ad.whatsappCaption,
    instagramCaption: ad.instagramCaption,
    tiktokCaption: ad.tiktokCaption,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => updateAd(ad.id, f),
    onSuccess: () => { toast.success('Ad updated'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.message || 'Could not save changes'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#141414] p-5"
      >
        <h2 className="text-base font-bold text-white">Edit ad</h2>
        <div><label className={label}>Title *</label><input className={input} value={f.title} onChange={set('title')} maxLength={120} required /></div>
        <div><label className={label}>Product / combo</label><input className={input} value={f.product} onChange={set('product')} maxLength={120} /></div>
        <p className="text-[11px] text-white/40">Type <b>{'{{LINK}}'}</b> where the partner's own link should go.</p>
        {([
          ['whatsappCaption', 'WhatsApp caption'],
          ['instagramCaption', 'Instagram caption'],
          ['tiktokCaption', 'TikTok caption'],
        ] as const).map(([k, l]) => (
          <div key={k}>
            <label className={label}>{l}</label>
            <textarea className={input} rows={3} value={f[k]} onChange={set(k)} maxLength={2200} />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70">Cancel</button>
          <button disabled={mut.isPending} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-bold disabled:opacity-50">
            {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function AdRow({ ad, onChange }: { ad: AdminAd; onChange: () => void }) {
  const { confirm } = useDialogs();
  const [editing, setEditing] = useState(false);
  const toggle = useMutation({
    mutationFn: () => updateAd(ad.id, { active: !ad.active }),
    onSuccess: onChange,
    onError: () => toast.error('Could not update the ad'),
  });
  const del = useMutation({
    mutationFn: () => deleteAd(ad.id),
    onSuccess: () => { toast.success('Ad deleted'); onChange(); },
    onError: () => toast.error('Could not delete the ad'),
  });

  return (
    <div className="rounded-xl border border-white/10 p-3 flex gap-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="w-20 h-20 rounded-lg bg-black/40 overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-white/40">
        {ad.kind === 'image' && <img src={ad.url} alt="" className="w-full h-full object-cover" />}
        {ad.kind === 'video' && <video src={ad.url} className="w-full h-full object-cover" muted preload="metadata" />}
        {ad.kind === 'text' && 'Caption only'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white truncate">{ad.title}</p>
        <p className="text-xs text-white/40 truncate">{ad.product || 'No product label'} · {ad.kind}</p>
        <span className={`inline-block mt-1 rounded-full border px-2 py-0.5 text-[10px] ${ad.active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-white/5 text-white/40 border-white/10'}`}>
          {ad.active ? 'Visible to partners' : 'Hidden'}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={() => setEditing(true)} className="p-2 rounded-lg border border-white/10 text-white/60 hover:text-primary" title="Edit">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => toggle.mutate()} disabled={toggle.isPending} className="p-2 rounded-lg border border-white/10 text-white/60 hover:text-primary" title={ad.active ? 'Hide' : 'Show'}>
          {ad.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={async () => { if (await confirm({ title: 'Delete this ad?', message: `"${ad.title}" will be removed for all partners.`, confirmText: 'Delete', danger: true })) del.mutate(); }} disabled={del.isPending} className="p-2 rounded-lg border border-white/10 text-red-300/70 hover:text-red-300" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {editing && <EditAdModal ad={ad} onClose={() => setEditing(false)} onSaved={onChange} />}
    </div>
  );
}

export default function AdminAds() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-ads'], queryFn: listAds });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-ads'] });

  return (
    <AdminFrame>
      <SEO title="Partner Ads — Admin" />
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
      </Link>
      <h1 className="text-xl font-bold text-white">Partner Ads</h1>
      <p className="text-xs text-white/40 mt-1 mb-5">Approved partners can download these and copy the captions, with their own link added.</p>

      <NewAdForm onDone={refresh} />

      {q.isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-white/40">No ads yet.</p>
      ) : (
        <div className="space-y-3">{q.data!.map((a) => <AdRow key={a.id} ad={a} onChange={refresh} />)}</div>
      )}
    </AdminFrame>
  );
}
