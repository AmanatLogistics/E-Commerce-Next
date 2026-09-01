import "server-only";

/**
 * Fixed-window rate limiter, in process memory.
 *
 * This is honest about what it is: it protects a single instance only, and it resets when
 * the process restarts. Behind more than one instance it must be swapped for a shared
 * store (Redis). That limitation is stated in the README rather than left to be discovered.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
let lastSweep = 0;

function sweep(now: number): void {
  // Amortised cleanup so the map cannot grow without bound under a flood of unique keys.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** The limits named in docs/SPEC.md §6. */
export const limits = {
  login: { limit: 5, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 3, windowMs: 60 * 60_000 },
  search: { limit: 30, windowMs: 60_000 },
  /** Enquiries are the one public write, so they get the tightest sensible window. */
  enquiry: { limit: 5, windowMs: 30 * 60_000 },
} as const;

/** Tests need a clean slate between cases. */
export function resetRateLimits(): void {
  windows.clear();
}
