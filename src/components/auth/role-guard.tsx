"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { getDashboardPathForRole } from "@/lib/rbac";
import { type Role } from "@/shared/rbac";
import { useAuthActions } from "@convex-dev/auth/react";
import * as Sentry from "@sentry/nextjs";

interface RoleGuardProps {
  readonly allow: ReadonlyArray<Role>;
  readonly children: ReactNode;
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery(api.rbac.currentUser);
  const { signOut } = useAuthActions();

  useEffect(() => {
    Sentry.startSpan({ op: "auth.rbac", name: "role-guard" }, (span) => {
      if (me === undefined) return; // loading
      if (me === null) {
        // Not authenticated -> send to auth
        if (pathname !== "/auth") router.replace("/auth");
        span?.setAttribute("state", "unauthenticated");
        return;
      }
      if (me.isDeleted || me.isBlocked) {
        span?.setAttribute("state", "blocked_or_deleted");
        Sentry.captureException(new Error("RBAC_FORBIDDEN"), {
          tags: { reason: me.isDeleted ? "deleted" : "blocked" },
        });
        void signOut();
        router.replace("/auth");
        return;
      }
      const role = me.role;
      const isAllowed = allow.includes(role);
      span?.setAttribute("role", role);
      span?.setAttribute("allowed", String(isAllowed));
      span?.setAttribute("path", pathname ?? "");
      if (!isAllowed) {
        Sentry.captureException(new Error("RBAC_DENIED"), {
          tags: { role, path: pathname ?? "" },
        });
        // Redirect to the correct dashboard based on role
        router.replace(getDashboardPathForRole(role));
      }
    });
  }, [me, router, pathname, signOut, allow]);

  if (me === undefined) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
        Loading...
      </div>
    );
  }
  if (me === null) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
        Redirecting...
      </div>
    );
  }
  if (!allow.includes(me.role)) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
        Redirecting...
      </div>
    );
  }
  return <>{children}</>;
}
