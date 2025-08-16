import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import type { ReactNode } from "react";
import { getDashboardPathForRole } from "@/lib/rbac";
import { ROLES } from "@/shared/rbac";

interface AdminLayoutProps {
  readonly children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const token = await convexAuthNextjsToken();
  const me = await fetchQuery(api.rbac.currentUser, {}, { token });
  if (!me) redirect("/auth");
  if (me.isDeleted || me.isBlocked) redirect("/auth");
  if (me.role !== ROLES.ADMIN) {
    redirect(getDashboardPathForRole(me.role));
  }
  return <>{children}</>;
}
