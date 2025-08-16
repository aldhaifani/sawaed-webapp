/**
 * Server-side RBAC utilities for Next.js API routes and server components.
 */
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { type Role } from "@/shared/rbac";
import * as Sentry from "@sentry/nextjs";

export interface NodeCurrentUser {
  readonly userId: string;
  readonly authUserId: string;
  readonly email: string;
  readonly role: Role;
  readonly isBlocked: boolean;
  readonly isDeleted: boolean;
}

/** Fetch current user using the server token. */
export async function getCurrentUserNode(): Promise<NodeCurrentUser | null> {
  const token = await convexAuthNextjsToken();
  const me = await fetchQuery(api.rbac.currentUser, {}, { token });
  return (me as unknown as NodeCurrentUser) ?? null;
}

/** Require an authenticated, active user. */
export async function requireUserNode(): Promise<NodeCurrentUser> {
  const me = await getCurrentUserNode();
  if (!me) {
    Sentry.captureException(new Error("UNAUTHENTICATED"));
    throw new Error("UNAUTHENTICATED");
  }
  if (me.isDeleted || me.isBlocked) {
    Sentry.captureException(new Error("FORBIDDEN"), {
      tags: { reason: me.isDeleted ? "deleted" : "blocked" },
    });
    throw new Error("FORBIDDEN");
  }
  return me;
}

/** Require that the current user's role is one of `allowed`. */
export async function requireRoleNode(
  allowed: ReadonlyArray<Role>,
): Promise<NodeCurrentUser> {
  const me = await requireUserNode();
  if (!allowed.includes(me.role)) {
    Sentry.captureException(new Error("RBAC_DENIED"), {
      tags: { role: me.role },
    });
    throw new Error("FORBIDDEN");
  }
  return me;
}
