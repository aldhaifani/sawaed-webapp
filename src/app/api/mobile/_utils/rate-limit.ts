import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

/**
 * Very lightweight in-memory token-based rate limiter.
 * Note: Memory-based limits are best-effort and reset on server restarts.
 */
const buckets: Map<string, { count: number; resetAt: number }> = new Map<
  string,
  { count: number; resetAt: number }
>();

export type RateLimitOpts = {
  readonly token: string;
  readonly key: string; // route or action key for scoping
  readonly limit: number; // allow N requests per window
  readonly windowMs: number; // window size in ms
};

export function rateLimitCheck(
  opts: RateLimitOpts,
): { ok: true } | { ok: false; response: Response } {
  const now = Date.now();
  const bucketKey = `${opts.key}:${opts.token.slice(0, 16)}`;
  const current = buckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true } as const;
  }
  if (current.count < opts.limit) {
    current.count += 1;
    return { ok: true } as const;
  }
  Sentry.addBreadcrumb({
    category: "rate_limit",
    level: "warning",
    message: "rate_limited",
    data: { key: opts.key },
  });
  const retryAfter = Math.max(0, Math.ceil((current.resetAt - now) / 1000));
  const res = NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message: "Too many requests. Please try again later.",
      },
    },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
  return { ok: false as const, response: res };
}
