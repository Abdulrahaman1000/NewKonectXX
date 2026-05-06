import { useState } from 'react';
import { Play, X } from 'lucide-react';
import type { VideoSettings } from '@/types/settings';

interface Props {
  video: VideoSettings;
}

export function DemoVideo({ video }: Props) {
  const [showModal, setShowModal] = useState(false);

  // Hide entire section when no video uploaded yet.
  if (!video.url) return null;

  return (
    <>
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={video.title}
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden border border-primary/40 shadow-2xl"
            style={{ background: 'rgba(8,8,20,0.97)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Close video"
              className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={video.url}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="px-6 py-4 flex items-center justify-between border-t border-white/10">
              <p className="text-sm text-white/50">{video.title}</p>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm px-4 py-1.5 rounded-lg border border-white/15 hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section-padding py-20" style={{ background: 'rgba(0,0,0,0.25)' }}>
        <div className="container-premium">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-3">Watch It Live</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3 text-white">See It In Action</h2>
            <p className="text-white/45 max-w-md mx-auto text-[15px]">
              Watch how it transforms your daily lifestyle
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            aria-label={`Play ${video.title}`}
            className="relative w-full rounded-2xl overflow-hidden border border-white/10 hover:border-primary/40 transition-all duration-300 group block"
            style={{ aspectRatio: '16/7' }}
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black/55 group-hover:bg-black/45 transition-colors" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 shadow-[0_0_40px_rgba(255,215,0,0.4)]">
                <Play className="w-8 h-8 text-black ml-1" />
              </div>
              <span className="text-white/70 text-sm font-medium group-hover:text-white/90 transition-colors">
                Click to play
              </span>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <p className="text-white font-bold text-lg">{video.title}</p>
                <p className="text-white/50 text-sm">See the products in action</p>
              </div>
              {video.duration && (
                <span className="hidden sm:flex items-center gap-2 text-white/40 text-xs">
                  <Play className="w-3 h-3" /> {video.duration}
                </span>
              )}
            </div>
          </button>
        </div>
      </section>
    </>
  );
}
