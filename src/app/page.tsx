import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { cookies } from "next/headers";

/**
 * Root route: locale-aware redirect.
 * - If authenticated: uses user's languagePreference ("ar" | "en") and redirects to `/${locale}`.
 * - If unauthenticated: defaults to Arabic and redirects to `/ar/auth`.
 */
export default async function RootRedirect(): Promise<never> {
  const me = await fetchQuery(api.rbac.currentUser, {});
  if (!me) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("locale")?.value;
    const locale =
      cookieLocale === "en" || cookieLocale === "ar" ? cookieLocale : "ar";
    redirect(`/${locale}/auth`);
  }
  const locale: "ar" | "en" = me.languagePreference;
  redirect(`/${locale}`);
}
