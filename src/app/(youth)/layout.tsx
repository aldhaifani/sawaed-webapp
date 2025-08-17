import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import type { ReactNode } from "react";
import { getDashboardPathForRole, ROLES } from "@/shared/rbac";

interface YouthLayoutProps {
  readonly children: ReactNode;
}

/**
 * Youth-only layout. Place youth routes under `src/app/(youth)/...` to enforce server-side RBAC.
 * This layout redirects non-youth roles to their dashboards and unauthenticated users to /auth.
 */
export default async function YouthLayout({ children }: YouthLayoutProps) {
  const token = await convexAuthNextjsToken();
  const me = await fetchQuery(api.rbac.currentUser, {}, { token });
  if (!me) redirect("/auth");
  if (me.isDeleted || me.isBlocked) redirect("/auth");
  if (me.role !== ROLES.YOUTH) {
    redirect(getDashboardPathForRole(me.role));
  }
  return <>{children}</>;
}
