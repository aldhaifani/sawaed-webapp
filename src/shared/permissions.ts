/**
 * Central permission matrix and helpers used by both Next.js and Convex.
 */
import { type Role, ROLES } from "@/shared/rbac";

export type Resource = "events" | "users" | "registrations" | "profiles";

export type Action = "read" | "create" | "update" | "delete" | "manage";

export type PermissionMatrix = Readonly<
  Record<Resource, Readonly<Record<Action, ReadonlyArray<Role>>>>
>;

export const PERMISSIONS: PermissionMatrix = {
  events: {
    read: [ROLES.YOUTH, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    create: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    update: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    delete: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    manage: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  },
  users: {
    read: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    create: [ROLES.SUPER_ADMIN],
    update: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    delete: [ROLES.SUPER_ADMIN],
    manage: [ROLES.SUPER_ADMIN],
  },
  registrations: {
    read: [ROLES.YOUTH, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    create: [ROLES.YOUTH, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    update: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    delete: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    manage: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  },
  profiles: {
    read: [ROLES.YOUTH, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    create: [ROLES.YOUTH, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    update: [ROLES.YOUTH, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    delete: [ROLES.SUPER_ADMIN],
    manage: [ROLES.SUPER_ADMIN],
  },
} as const;

export interface CanParams {
  readonly role: Role;
  readonly resource: Resource;
  readonly action: Action;
}

export function can({ role, resource, action }: CanParams): boolean {
  const allowed = PERMISSIONS[resource][action];
  return allowed.includes(role);
}

export function assertCan(params: CanParams): void {
  if (!can(params)) {
    throw new Error("FORBIDDEN");
  }
}
