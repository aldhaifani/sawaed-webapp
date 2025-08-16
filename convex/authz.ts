import type { QueryCtx, MutationCtx } from "./_generated/server";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { Role } from "@/shared/rbac";

export interface AppUser {
  readonly _id: Id<"appUsers">;
  readonly authUserId: Id<"users">;
  readonly email: string;
  readonly role: Role;
  readonly isBlocked: boolean;
  readonly isDeleted: boolean;
}

type Ctx = QueryCtx | MutationCtx;

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

export async function requireUser(ctx: Ctx): Promise<AppUser> {
  const user = await getCurrentAppUser(ctx);
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.isDeleted || user.isBlocked) throw new Error("FORBIDDEN");
  return user;
}

export async function requireRole(
  ctx: Ctx,
  allowed: ReadonlyArray<Role>,
): Promise<AppUser> {
  const user = await requireUser(ctx);
  if (!allowed.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
