import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

export type Role = "YOUTH" | "ADMIN" | "SUPER_ADMIN";

export interface AppUser {
  readonly _id: Id<"appUsers">;
  readonly authUserId: Id<"users">;
  readonly email: string;
  readonly role: Role;
  readonly isBlocked: boolean;
  readonly isDeleted: boolean;
}

export async function getCurrentAppUser(
  ctx: QueryCtx | MutationCtx,
): Promise<AppUser | null> {
  const authUserId = await auth.getUserId(ctx);
  if (!authUserId) return null;
  const appUser = await ctx.db
    .query("appUsers")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
  if (!appUser) return null;
  return {
    _id: appUser._id as Id<"appUsers">,
    authUserId,
    email: appUser.email,
    role: appUser.role as Role,
    isBlocked: appUser.isBlocked,
    isDeleted: appUser.isDeleted,
  };
}

export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<AppUser> {
  const user = await getCurrentAppUser(ctx);
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.isDeleted || user.isBlocked) throw new Error("FORBIDDEN");
  return user;
}

export function hasRole(user: AppUser, role: Role): boolean {
  return user.role === role;
}

export function isAdmin(user: AppUser): boolean {
  return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
}

export function isSuperAdmin(user: AppUser): boolean {
  return user.role === "SUPER_ADMIN";
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: ReadonlyArray<Role>,
): Promise<AppUser> {
  const user = await requireAuth(ctx);
  if (!allowed.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
