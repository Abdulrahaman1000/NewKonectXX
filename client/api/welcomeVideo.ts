/** SC-TOUR  The welcome tour video (public). */
export interface WelcomeVideo { url: string; poster: string; title: string; caption: string; version: number }
export async function fetchWelcomeVideo(): Promise<WelcomeVideo | null> {
  try {
    const res = await fetch('/api/welcome-video');
    if (!res.ok) return null;
    const j = await res.json();
    return j?.data ?? null;
  } catch { return null; }
}
