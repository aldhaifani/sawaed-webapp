/*
  Lightweight in-memory rate limiter for MVP purposes.
  Not suitable for multi-instance deployments. Replace with a proper store later.
*/

export type RateLimitDecision = {
  readonly allowed: boolean;
  readonly remaining: number;
};

const buckets = new Map<string, { count: number; windowStart: number }>();

/**
 * Simple fixed-window limiter: limit requests per windowMs per key.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitDecision {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }
  if (now - current.windowStart >= windowMs) {
    // new window
    current.windowStart = now;
    current.count = 1;
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count) };
}

export function getClientIp(req: Request): string {
  // Best-effort extraction; Next.js may pass through these headers on platforms
  const headers = (req as unknown as { headers: Headers }).headers;
  const xfwd = headers.get("x-forwarded-for");
  if (xfwd) {
    const first = xfwd.split(",")[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return `ip:${realIp}`;
  const cf = headers.get("cf-connecting-ip");
  if (cf) return `ip:${cf}`;
  // Fallback to user-agent as a coarse key to avoid blank keys
  const ua = headers.get("user-agent") ?? "unknown";
  return `ua:${ua.slice(0, 120)}`;
}
