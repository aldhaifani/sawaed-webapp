import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { ReactNode } from "react";
import {
  getDashboardPathForRoleLocale,
  getDashboardPathForRole,
} from "@/shared/rbac";
import { ROLES } from "@/shared/rbac";
import { IntlProvider } from "@/components/i18n/intl-provider";
import { Direction } from "@/components/i18n/direction";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";
import { Navbar } from "@/components/ui/navbar";

interface SuperAdminLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: "en" | "ar" }>;
}

export default async function SuperAdminLayout(props: SuperAdminLayoutProps) {
  const { children } = props;
  const { locale: routeLocale } = await props.params;
  let me: Awaited<
    ReturnType<typeof fetchQuery<typeof api.rbac.currentUser>>
  > | null = null;
  try {
    const token = await convexAuthNextjsToken();
    me = await fetchQuery(api.rbac.currentUser, {}, { token });
  } catch {
    redirect(`/${routeLocale}/auth`);
  }
  if (!me) redirect(`/${routeLocale}/auth`);
  if (me.isDeleted || me.isBlocked) redirect(`/${routeLocale}/auth`);
  if (me.role !== ROLES.SUPER_ADMIN) {
    const preferredLocale = me.languagePreference ?? routeLocale;
    try {
      redirect(getDashboardPathForRoleLocale(me.role, preferredLocale));
    } catch {
      redirect(getDashboardPathForRole(me.role));
    }
  }
  // Use the route locale for rendering; cookie sync is handled in middleware
  const locale = routeLocale;
  return (
    <IntlProvider locale={locale}>
      <Direction locale={locale} />
      <ConvexClientProvider>
        <Navbar role="SUPER_ADMIN" />
        {children}
      </ConvexClientProvider>
    </IntlProvider>
  );
}
