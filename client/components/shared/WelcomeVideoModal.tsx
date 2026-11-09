/** SC-TOUR  Welcome tour: a popup with the owner's video, shown once to each new visitor (again when a new video is uploaded). */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, X } from 'lucide-react';
import { fetchWelcomeVideo } from '@/api/welcomeVideo';
import { setTourOpen } from '@/lib/tourState';

const SEEN_KEY = 'sc_tour_seen';
const SKIP_PATHS = ['/pay/result', '/checkout', '/order-confirmation', '/admin', '/partner'];
const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-white/70';

const readSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY) || 0); } catch { return 0; } };
const writeSeen = (v: number) => { try { localStorage.setItem(SEEN_KEY, String(v)); } catch { /* private mode */ } };

/** YouTube links become an embed address; anything else is played as a plain video file. */
function youTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1` : null;
}
const posterOf = (poster: string, url: string) =>
  poster || (url.includes('res.cloudinary.com') ? url.replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, '.jpg') : '');

export function WelcomeVideoModal() {
  const { pathname, search } = useLocation();
  const { data } = useQuery({ queryKey: ['welcome-video'], queryFn: fetchWelcomeVideo, staleTime: 5 * 60 * 1000 });
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  const skip = SKIP_PATHS.some((p) => pathname.startsWith(p));

  // First visit (or a new video): open shortly after the page appears.
  useEffect(() => {
    if (!data || skip) return;
    const forced = new URLSearchParams(search).get('tour') === '1';
    if (!forced && readSeen() >= data.version) return;
    const t = setTimeout(() => { setPlaying(false); setOpen(true); }, 1200);
    return () => clearTimeout(t);
  }, [data, skip, search]);

  // "Watch the tour" buttons anywhere on the site.
  useEffect(() => {
    const h = () => { if (data) { setPlaying(false); setOpen(true); } };
    window.addEventListener('sc-open-tour', h);
    return () => window.removeEventListener('sc-open-tour', h);
  }, [data]);

  useEffect(() => { setTourOpen(open); return () => setTourOpen(false); }, [open]);

  const close = () => { setOpen(false); setPlaying(false); if (data) writeSeen(data.version); };

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !data) return null;
  const embed = youTubeEmbed(data.url);
  const poster = posterOf(data.poster, data.url);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={data.title || 'Welcome tour'}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl bg-card text-card-foreground border border-border shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        <button type="button" onClick={close} aria-label="Close" className={`absolute top-2.5 right-2.5 z-10 w-11 h-11 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black ${FOCUS}`}><X className="w-5 h-5" /></button>

        <div className="relative w-full aspect-video bg-black rounded-t-3xl overflow-hidden">
          {playing ? (
            embed ? (
              <iframe src={embed} title={data.title || 'Welcome tour'} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            ) : (
              <video src={data.url} poster={poster || undefined} className="absolute inset-0 w-full h-full" controls autoPlay playsInline preload="none" />
            )
          ) : (
            <button type="button" onClick={() => setPlaying(true)} aria-label="Play the welcome video" className={`absolute inset-0 w-full h-full group ${FOCUS}`}>
              {poster ? <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <span className="absolute inset-0 bg-gradient-to-br from-primary to-amber-500" />}
              <span className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors" />
              <span className="absolute inset-0 grid place-items-center"><span className="w-20 h-20 rounded-full bg-primary text-black grid place-items-center shadow-xl"><Play className="w-9 h-9 ml-1" fill="currentColor" /></span></span>
            </button>
          )}
        </div>

        <div className="p-5 md:p-6">
          <h2 className="text-xl md:text-2xl font-black text-foreground leading-tight">{data.title || 'Welcome to Smart Combo'}</h2>
          {data.caption && <p className="text-sm md:text-base text-muted-foreground mt-1.5 leading-relaxed">{data.caption}</p>}
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <Link to="/products" onClick={close} className="btn-primary flex-1 h-12 flex items-center justify-center font-bold">Start shopping</Link>
            <Link to="/pay" onClick={close} className="flex-1 h-12 flex items-center justify-center rounded-xl border border-border font-bold text-foreground hover:bg-muted">Pay bills</Link>
          </div>
          <button type="button" onClick={close} className={`mt-2 w-full min-h-[44px] text-sm text-muted-foreground hover:text-foreground ${FOCUS}`}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}
export default WelcomeVideoModal;
