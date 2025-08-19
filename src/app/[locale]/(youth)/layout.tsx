import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { ReactNode } from "react";
import {
  getDashboardPathForRoleLocale,
  getDashboardPathForRole,
  ROLES,
} from "@/shared/rbac";
import { IntlProvider } from "@/components/i18n/intl-provider";
import { Direction } from "@/components/i18n/direction";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";
import { OnboardingGate } from "@/components/auth/onboarding-gate";

interface LocaleYouthLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: "en" | "ar" }>;
}

/**
 * Locale segment wrapper for youth routes. It sets the `locale` cookie based on the URL param
 * and then defers to the existing `(youth)/layout.tsx` below in the tree for RBAC checks and i18n.
 */
export default async function LocaleYouthLayout(props: LocaleYouthLayoutProps) {
  const { children } = props;
  const { locale } = await props.params;
  let me: Awaited<
    ReturnType<typeof fetchQuery<typeof api.rbac.currentUser>>
  > | null = null;
  try {
    const token = await convexAuthNextjsToken();
    me = await fetchQuery(api.rbac.currentUser, {}, { token });
  } catch {
    redirect(`/${locale}/auth`);
  }
  if (!me) redirect(`/${locale}/auth`);
  if (me.isDeleted || me.isBlocked) redirect(`/${locale}/auth`);
  if (me.role !== ROLES.YOUTH) {
    try {
      redirect(getDashboardPathForRoleLocale(me.role, locale));
    } catch {
      redirect(getDashboardPathForRole(me.role));
    }
  }
  // Use the route locale for rendering; cookie sync is handled in middleware
  const localeToUse = locale;
  return (
    <IntlProvider locale={localeToUse}>
      <Direction locale={localeToUse} />
      <OnboardingGate />
      <div className="flex w-full justify-end p-2">
        <LanguageSwitcher />
      </div>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </IntlProvider>
  );
}
