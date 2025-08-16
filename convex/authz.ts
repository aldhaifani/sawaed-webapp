import type { QueryCtx, MutationCtx } from "./_generated/server";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import { type Role, ROLES } from "@/shared/rbac";

/**
 * AppUser: strongly-typed projection of the `appUsers` table.
 */
export interface AppUser {
  readonly _id: Id<"appUsers">;
  readonly authUserId: Id<"users">;
  readonly email: string;
  readonly role: Role;
  readonly isBlocked: boolean;
  readonly isDeleted: boolean;
}

type Ctx = QueryCtx | MutationCtx;

/**
 * Get the current AppUser or null if not authenticated or not provisioned.
 */
export async function getCurrentAppUser(ctx: Ctx): Promise<AppUser | null> {
  const authUserId = await auth.getUserId(ctx);
  if (!authUserId) return null;
  const appUser = await ctx.db
    .query("appUsers")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
  if (!appUser) return null;
  return appUser as unknown as AppUser;
}

/**
 * Require an authenticated, non-blocked, non-deleted user.
 * Throws "UNAUTHENTICATED" or "FORBIDDEN".
 */
export async function requireUser(ctx: Ctx): Promise<AppUser> {
  const user = await getCurrentAppUser(ctx);
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.isDeleted || user.isBlocked) throw new Error("FORBIDDEN");
  return user;
}

/**
 * Require that the current user's role is one of `allowed`.
 * Throws "UNAUTHENTICATED" or "FORBIDDEN".
 */
export async function requireRole(
  ctx: Ctx,
  allowed: ReadonlyArray<Role>,
): Promise<AppUser> {
  const user = await requireUser(ctx);
  if (!allowed.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

/** Check if the user is an Admin or Super Admin. */
export function isAdmin(user: AppUser): boolean {
  return user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN;
}

/** Check if the user is a Super Admin. */
export function isSuperAdmin(user: AppUser): boolean {
  return user.role === ROLES.SUPER_ADMIN;
}

/**
 * Enforce role membership inside a Convex handler.
 * Usage: await enforceRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
 */
export async function enforceRole(
  ctx: Ctx,
  allowed: ReadonlyArray<Role>,
): Promise<AppUser> {
  return requireRole(ctx, allowed);
}
