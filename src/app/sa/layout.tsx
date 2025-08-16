import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import type { ReactNode } from "react";
import { getDashboardPathForRole } from "@/lib/rbac";

interface SuperAdminLayoutProps {
  readonly children: ReactNode;
}

export default async function SuperAdminLayout({
  children,
}: SuperAdminLayoutProps) {
  const token = await convexAuthNextjsToken();
  const me = await fetchQuery(api.rbac.currentUser, {}, { token });
  if (!me) redirect("/auth");
  if (me.isDeleted || me.isBlocked) redirect("/auth");
  if (me.role !== "SUPER_ADMIN") {
    redirect(getDashboardPathForRole(me.role));
  }
  return <>{children}</>;
}
