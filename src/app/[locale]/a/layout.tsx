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

interface AdminLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: "en" | "ar" }>;
}

export default async function AdminLayout(props: AdminLayoutProps) {
  const { children } = props;
  const { locale: routeLocale } = await props.params;
  // Request locale is set in src/app/[locale]/layout.tsx
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
  if (me.role !== ROLES.ADMIN) {
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
        <Navbar role="ADMIN" />
        {children}
      </ConvexClientProvider>
    </IntlProvider>
  );
}
