"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { getDashboardPathForRoleLocale, type Role } from "@/shared/rbac";
import { useAuthActions } from "@convex-dev/auth/react";
import * as Sentry from "@sentry/nextjs";
import { useLocale } from "next-intl";

interface RoleGuardProps {
  readonly allow: ReadonlyArray<Role>;
  readonly children: ReactNode;
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery(api.rbac.currentUser);
  const { signOut } = useAuthActions();
  const locale = useLocale() as "en" | "ar";

  useEffect(() => {
    Sentry.startSpan({ op: "auth.rbac", name: "role-guard" }, (span) => {
      if (me === undefined) return; // loading

      const onAuthPage = (pathname ?? "").endsWith("/auth");
      span?.setAttribute("i18n.locale", locale);
      span?.setAttribute("path", pathname ?? "");

      if (me === null) {
        // Not authenticated -> send to auth with locale
        if (!onAuthPage) {
          const target = `/${locale}/auth`;
          span?.setAttribute("state", "unauthenticated");
          span?.setAttribute("redirect.target", target);
          router.replace(target);
        } else {
          span?.setAttribute("state", "unauthenticated_on_auth");
        }
        return;
      }
      if (me.isDeleted || me.isBlocked) {
        span?.setAttribute("state", "blocked_or_deleted");
        Sentry.captureException(new Error("RBAC_FORBIDDEN"), {
          tags: { reason: me.isDeleted ? "deleted" : "blocked" },
        });
        void signOut();
        const target = `/${locale}/auth`;
        span?.setAttribute("redirect.target", target);
        router.replace(target);
        return;
      }
      const role = me.role;
      const isAllowed = allow.includes(role);
      span?.setAttribute("role", role);
      span?.setAttribute("allowed", String(isAllowed));
      if (!isAllowed) {
        Sentry.captureException(new Error("RBAC_DENIED"), {
          tags: { role, path: pathname ?? "" },
        });
        // Redirect to the correct dashboard based on role & locale
        const target = getDashboardPathForRoleLocale(role, locale);
        span?.setAttribute("redirect.target", target);
        router.replace(target);
      }
    });
  }, [me, router, pathname, signOut, allow, locale]);

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
