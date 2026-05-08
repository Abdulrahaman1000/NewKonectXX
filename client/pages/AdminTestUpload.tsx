/**
 * Simple test page for the ImageUploader.
 * Visit /admin/test-upload to verify Cloudinary integration works.
 *
 * After confirming uploads work, this page can be deleted.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ImageUploader } from '@/components/admin/ImageUploader';

export default function AdminTestUpload() {
  const [imageUrl, setImageUrl] = useState('');

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
          <ArrowLeft className="w-3 h-3" />
          Back to dashboard
        </Link>

        <h1 className="text-2xl font-black text-white mb-2">Image Upload Test</h1>
        <p className="text-white/50 text-sm mb-8">
          Try uploading an image. If it works, you'll see the Cloudinary URL below.
        </p>

        <div
          className="rounded-2xl border border-white/10 p-6 mb-6"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <ImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            label="Test image"
            aspect="square"
          />
        </div>

        {imageUrl && (
          <div
            className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5"
          >
            <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold mb-2">
              ✅ Upload successful
            </p>
            <p className="text-xs text-white/50 mb-2">Cloudinary URL:</p>
            <code className="block text-xs text-emerald-300 break-all bg-black/40 p-3 rounded-lg">
              {imageUrl}
            </code>
            <p className="text-xs text-white/40 mt-3">
              You can copy this URL and open it in a new tab to verify it works.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
