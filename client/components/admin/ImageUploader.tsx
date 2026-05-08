/**
 * ImageUploader — reusable admin component.
 *
 * Click or drag-and-drop to upload an image to Cloudinary.
 * Returns the secure URL via onChange.
 *
 * Used in:
 *  - Combo CRUD (per-item images, hero image)
 *  - Hero slide editor
 *  - Testimonial avatars
 *
 * Props:
 *  value     — current image URL (controlled)
 *  onChange  — fires with new URL after successful upload, or empty after remove
 *  label     — small label shown above the dropzone
 *  aspect    — aspect ratio for preview (e.g. 'square', 'video', 'auto')
 */

import { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { uploadToCloudinary, cldUrl } from '@/lib/cloudinary';
import { toast } from 'sonner';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspect?: 'square' | 'video' | 'auto';
  maxSizeMB?: number;
}

export function ImageUploader({
  value,
  onChange,
  label,
  aspect = 'square',
  maxSizeMB = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image too large. Max ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, setProgress);
      onChange(result.url);
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const aspectCls = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspect];

  // If we have a value, show the preview with replace/remove controls
  if (value && !uploading) {
    return (
      <div>
        {label && (
          <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
            {label}
          </span>
        )}
        <div
          className={`relative rounded-xl overflow-hidden border border-white/10 ${aspectCls} bg-black/30 group`}
        >
          <img
            src={cldUrl(value, 'w_600,h_600,c_fill,q_auto,f_auto')}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-300 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    );
  }

  // Empty / uploading state — show dropzone
  return (
    <div>
      {label && (
        <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={`w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${aspectCls} ${
          dragOver
            ? 'border-primary/60 bg-primary/5'
            : uploading
            ? 'border-primary/40 bg-primary/5'
            : 'border-white/15 hover:border-white/30 bg-white/[0.02]'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-white/70">Uploading... {progress}%</p>
            <div className="w-32 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <ImageIcon className="w-6 h-6 text-white/40" />
            <p className="text-xs font-bold text-white/70">
              {dragOver ? 'Drop to upload' : 'Click or drag image here'}
            </p>
            <p className="text-[10px] text-white/30">JPG, PNG, WebP · Max {maxSizeMB}MB</p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
