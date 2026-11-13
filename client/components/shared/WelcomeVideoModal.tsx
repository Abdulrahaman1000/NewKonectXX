/** SC-TOUR  Welcome tour: a full-screen, ad-style video. Starts by itself (muted), tap for sound. Shows again every 24 hours, and at once when a new video is uploaded. */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, Volume2, VolumeX, X } from 'lucide-react';
import { fetchWelcomeVideo } from '@/api/welcomeVideo';
import { setTourOpen } from '@/lib/tourState';

const SEEN_KEY = 'sc_tour_last'; // { t: time it was closed, v: video version }
const EVERY_MS = 24 * 60 * 60 * 1000;
const SKIP_PATHS = ['/pay/result', '/checkout', '/order-confirmation', '/admin', '/partner'];
const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-white/80';

const readSeen = (): { t: number; v: number } => { try { const j = JSON.parse(localStorage.getItem(SEEN_KEY) || ''); return { t: Number(j.t) || 0, v: Number(j.v) || 0 }; } catch { return { t: 0, v: 0 }; } };
const writeSeen = (v: number) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify({ t: Date.now(), v })); } catch { /* private mode */ } };

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
const posterOf = (poster: string, url: string) =>
  poster || (url.includes('res.cloudinary.com') ? url.replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, '.jpg') : '');

export function WelcomeVideoModal() {
  const { pathname, search } = useLocation();
  const { data } = useQuery({ queryKey: ['welcome-video'], queryFn: fetchWelcomeVideo, staleTime: 5 * 60 * 1000 });
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false); // the phone refused to start the video by itself
  const [progress, setProgress] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const skip = SKIP_PATHS.some((p) => pathname.startsWith(p));

  // Open on arrival when it has not been seen for 24 hours (or the video is new).
  useEffect(() => {
    if (!data || skip) return;
    const forced = new URLSearchParams(search).get('tour') === '1';
    const seen = readSeen();
    if (!forced && seen.v >= data.version && Date.now() - seen.t < EVERY_MS) return;
    const t = setTimeout(() => { setMuted(true); setBlocked(false); setProgress(0); setOpen(true); }, 1000);
    return () => clearTimeout(t);
  }, [data, skip, search]);

  // "Watch the tour" buttons anywhere on the site.
  useEffect(() => {
    const h = () => { if (data) { setMuted(true); setBlocked(false); setProgress(0); setOpen(true); } };
    window.addEventListener('sc-open-tour', h);
    return () => window.removeEventListener('sc-open-tour', h);
  }, [data]);

  useEffect(() => { setTourOpen(open); return () => setTourOpen(false); }, [open]);

  const close = () => { setOpen(false); if (data) writeSeen(data.version); };

  // While open: no page scrolling behind, Escape closes, keyboard focus starts on Close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k);
    closeBtn.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); };
  }, [open, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start the video by itself (muted, as phones require).
  useEffect(() => {
    if (!open || !video.current) return;
    const p = video.current.play();
    if (p && typeof p.catch === 'function') p.catch(() => setBlocked(true));
  }, [open]);

  if (!open || !data) return null;
  const yt = youTubeId(data.url);
  const poster = posterOf(data.poster, data.url);

  const toggleSound = () => {
    const next = !muted; setMuted(next);
    if (yt) frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: next ? 'mute' : 'unMute', args: [] }), '*');
    else if (video.current) { video.current.muted = next; if (!next) video.current.volume = 1; }
  };
  const startManually = () => { setBlocked(false); video.current?.play().catch(() => setBlocked(true)); };

  return (
    <div className="fixed inset-0 z-[110] bg-black text-white flex flex-col" role="dialog" aria-modal="true" aria-label={data.title || 'Welcome tour'}>
      {/* Video fills the screen */}
      <div className="absolute inset-0">
        {yt ? (
          <iframe ref={frame} title={data.title || 'Welcome tour'} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&enablejsapi=1`} />
        ) : (
          <video ref={video} src={data.url} poster={poster || undefined} className="absolute inset-0 w-full h-full object-contain bg-black" autoPlay muted={muted} playsInline preload="auto"
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
            onPlaying={() => setBlocked(false)} />
        )}
        {blocked && !yt && (
          <button type="button" onClick={startManually} aria-label="Play the welcome video" className={`absolute inset-0 grid place-items-center bg-black/30 ${FOCUS}`}>
            <span className="w-20 h-20 rounded-full bg-primary text-black grid place-items-center shadow-xl"><Play className="w-9 h-9 ml-1" fill="currentColor" /></span>
          </button>
        )}
      </div>

      {/* Progress line */}
      {!yt && <div className="absolute top-0 inset-x-0 h-1 bg-white/20 z-10"><div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} /></div>}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 grid place-items-center shrink-0"><span className="text-black font-black text-[11px]">SC</span></span>
          <span className="text-sm font-black truncate">Smart Combo</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={toggleSound} aria-label={muted ? 'Turn the sound on' : 'Turn the sound off'} className={`h-11 px-3 rounded-full bg-black/55 backdrop-blur flex items-center gap-1.5 text-xs font-bold ${FOCUS}`}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}{muted ? 'Tap for sound' : 'Sound on'}
          </button>
          <button ref={closeBtn} type="button" onClick={close} aria-label="Close" className={`w-11 h-11 rounded-full bg-black/55 backdrop-blur grid place-items-center ${FOCUS}`}><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1" />

      {/* Bottom: title, text, buttons */}
      <div className="relative z-10 px-4 pt-16 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-xl md:text-2xl font-black leading-tight">{data.title || 'Welcome to Smart Combo'}</h2>
          {data.caption && <p className="text-sm text-white/80 mt-1 leading-snug">{data.caption}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link to="/products" onClick={close} className={`h-12 rounded-xl bg-primary text-black font-black flex items-center justify-center ${FOCUS}`}>Start shopping</Link>
            <Link to="/pay" onClick={close} className={`h-12 rounded-xl border border-white/40 bg-white/10 backdrop-blur font-black flex items-center justify-center ${FOCUS}`}>Pay bills</Link>
          </div>
          <button type="button" onClick={close} className={`mt-1 w-full min-h-[44px] text-sm text-white/70 hover:text-white ${FOCUS}`}>Skip</button>
        </div>
      </div>
    </div>
  );
}
export default WelcomeVideoModal;
