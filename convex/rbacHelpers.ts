import type { Role } from "@/shared/rbac";
export type { AppUser } from "./authz";
export { getCurrentAppUser, requireRole, isAdmin, isSuperAdmin } from "./authz";
import { requireUser } from "./authz";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** Backwards-compatible alias: was `requireAuth`, now points to `requireUser`. */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<import("./authz").AppUser> {
  return requireUser(ctx);
}

/** Helper kept for compatibility. Prefer comparing to ROLES constants. */
export function hasRole(user: import("./authz").AppUser, role: Role): boolean {
  return user.role === role;
}
