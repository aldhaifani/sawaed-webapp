import type { NextRequest } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { getBearerToken } from "./get-bearer-token";

export type ConvexTokenOptions = {
  readonly token: string | null;
};

/**
 * Resolve a Convex auth token for server-side API routes.
 * Order: Authorization: Bearer <token> header → Convex Next.js auth cookie → null.
 */
export async function resolveConvexToken(
  req: Request | NextRequest,
): Promise<string | null> {
  const fromHeader: string | null = getBearerToken(req);
  if (fromHeader) return fromHeader;
  try {
    const cookieToken: string | undefined | null =
      await convexAuthNextjsToken();
    return cookieToken ?? null;
  } catch {
    return null;
  }
}

export type ConvexHandler<T> = (options: ConvexTokenOptions) => Promise<T>;

/**
 * Execute the provided handler with a resolved Convex token.
 */
export async function withConvexToken<T>(
  req: Request | NextRequest,
  handler: ConvexHandler<T>,
): Promise<T> {
  const token: string | null = await resolveConvexToken(req);
  return handler({ token });
}
