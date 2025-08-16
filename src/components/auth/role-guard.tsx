"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { getDashboardPathForRole } from "@/lib/rbac";
import { type Role } from "@/shared/rbac";
import { useAuthActions } from "@convex-dev/auth/react";

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
    if (me === undefined) return; // loading
    if (me === null) {
      // Not authenticated -> send to auth
      if (pathname !== "/auth") router.replace("/auth");
      return;
    }
    if (me.isDeleted || me.isBlocked) {
      // Ensure session is cleared if the account is blocked/deleted
      void signOut();
      router.replace("/auth");
      return;
    }
    const role = me.role;
    const isAllowed = allow.includes(role);
    if (!isAllowed) {
      // Redirect to the correct dashboard based on role
      router.replace(getDashboardPathForRole(role));
    }
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
