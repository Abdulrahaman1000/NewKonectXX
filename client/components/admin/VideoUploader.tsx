/** SC-TOUR  Upload a video straight to Cloudinary (same unsigned preset as pictures). Gives back the video address. */
import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { CLOUDINARY_CONFIG } from '@/lib/cloudinary';

const MAX_MB = 100; // Cloudinary free plan limit per video

export function VideoUploader({ onChange }: { onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const pick = (file?: File) => {
    if (!file) return;
    setErr('');
    if (!file.type.startsWith('video/')) { setErr('Please choose a video file (MP4 works best).'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setErr(`That video is ${(file.size / 1048576).toFixed(0)} MB. The limit is ${MAX_MB} MB. Make it smaller (720p) or paste a YouTube link instead.`); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    if (CLOUDINARY_CONFIG.folder) fd.append('folder', CLOUDINARY_CONFIG.folder);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/video/upload`);
    xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); });
    xhr.addEventListener('load', () => {
      setPct(null);
      try {
        const j = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && j.secure_url) onChange(j.secure_url);
        else setErr((j?.error?.message || 'Upload failed') + '. You can paste a YouTube link instead.');
      } catch { setErr('Upload failed. You can paste a YouTube link instead.'); }
    });
    xhr.addEventListener('error', () => { setPct(null); setErr('Network error. Try again, or paste a YouTube link instead.'); });
    setPct(0); xhr.send(fd);
  };

  return (
    <div>
      <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      <button type="button" disabled={pct !== null} onClick={() => input.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-sm font-bold text-white hover:border-primary/40 disabled:opacity-60">
        {pct !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {pct !== null ? `Uploading ${pct}%` : 'Upload a video file'}
      </button>
      {err && <p role="alert" className="text-xs text-red-300 mt-2">{err}</p>}
    </div>
  );
}
