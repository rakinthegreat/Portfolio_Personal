// Live stats from the HP Pavilion home server (see server/stats.py + README for the tunnel).
// Configure with VITE_SERVER_STATS_URL at build time. Without it, or when the server is down,
// the desk just says the server is napping.
export interface ServerStats { uptime_s: number; containers: number; load1: number; hostname?: string }

const URL_ = import.meta.env.VITE_SERVER_STATS_URL as string | undefined;

export async function fetchServerStats(): Promise<ServerStats | null> {
  if (!URL_) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(URL_, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const s = (await res.json()) as ServerStats;
    return typeof s.uptime_s === 'number' && typeof s.containers === 'number' ? s : null;
  } catch {
    return null;
  }
}

export function describeStats(s: ServerStats | null) {
  if (!s) return '';
  const d = Math.floor(s.uptime_s / 86400);
  const h = Math.floor((s.uptime_s % 86400) / 3600);
  const up = d > 0 ? `${d} d ${h} h` : `${h} h`;
  return `Live: up ${up} · ${s.containers} container${s.containers === 1 ? '' : 's'} running · load ${s.load1.toFixed(2)}`;
}
