/**
 * Shared RBAC types and helpers used by both Next.js (client/server) and Convex.
 */

/** All supported roles in the system. */
export type Role = "YOUTH" | "ADMIN" | "SUPER_ADMIN";

/** Role constants to avoid magic strings. */
export const ROLES = {
  YOUTH: "YOUTH" as const,
  ADMIN: "ADMIN" as const,
  SUPER_ADMIN: "SUPER_ADMIN" as const,
};

/**
 * Return the default dashboard path for a given role.
 * Keep in sync with protected routes in `src/app/`.
 */
export function getDashboardPathForRole(role: Role): string {
  if (role === ROLES.ADMIN) return "/a";
  if (role === ROLES.SUPER_ADMIN) return "/sa";
  return "/";
}
