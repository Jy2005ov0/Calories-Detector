// Simple in-memory rate limiting for the AI endpoints.

export function rateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  let pruned = 0;
  return (key: string) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    // Drop stale keys now and then (not on every request), and never hold more than 50,000.
    if (hits.size > 10_000 && now - pruned > windowMs / 10) {
      pruned = now;
      for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
      // Still too many: drop the oldest keys (a Map keeps insertion order), never everyone's counters at once.
      for (const k of hits.keys()) {
        if (hits.size <= 40_000) break;
        hits.delete(k);
      }
    }
    return recent.length > max;
  };
}
