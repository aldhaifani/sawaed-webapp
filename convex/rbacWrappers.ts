import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Role } from "@/shared/rbac";
import { requireUser, requireRole } from "./authz";

export type Ctx = QueryCtx | MutationCtx;

export interface ConvexHandler<Args extends object, R> {
  (ctx: Ctx, args: Args): Promise<R>;
}

/**
 * Wrap a Convex handler to ensure an authenticated, active user exists.
 * The authenticated AppUser is returned, but you can also call `requireUser` inside.
 */
export function withUser<Args extends object, R>(
  handler: (
    ctx: Ctx,
    args: Args,
    user: Awaited<ReturnType<typeof requireUser>>,
  ) => Promise<R>,
): ConvexHandler<Args, R> {
  return async (ctx: Ctx, args: Args): Promise<R> => {
    const user = await requireUser(ctx);
    return handler(ctx, args, user);
  };
}

/**
 * Wrap a Convex handler to ensure the user has one of the allowed roles.
 */
export function withRole<Args extends object, R>(
  allowed: ReadonlyArray<Role>,
  handler: (
    ctx: Ctx,
    args: Args,
    user: Awaited<ReturnType<typeof requireRole>>,
  ) => Promise<R>,
): ConvexHandler<Args, R> {
  return async (ctx: Ctx, args: Args): Promise<R> => {
    const user = await requireRole(ctx, allowed);
    return handler(ctx, args, user);
  };
}
