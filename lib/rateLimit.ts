// Fixed-window rate limiter held in memory.
//
// Limitation: on serverless hosts like Vercel, each running instance has its own memory, so this is a best-effort guard and not a hard guarantee.

interface Entry {
  count: number;
  resetAt: number; // timestamp in ms when this window ends
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const hits = new Map<string, Entry>();
const MAX_TRACKED_KEYS = 1000;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now() // injectable so tests don't need real waiting
): RateLimitResult {
  // Keep memory bounded: when the map gets big, drop windows that have ended.
  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, e] of hits) {
      if (now >= e.resetAt) hits.delete(k);
    }
  }

  const entry = hits.get(key);

  // First request, or the previous window has ended: start a new window.
  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  // Window is still open and the limit is used up.
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}