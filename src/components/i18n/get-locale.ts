import { cookies } from "next/headers";

export type AppLocale = "en" | "ar";

/**
 * Determine current locale from the `locale` cookie. Defaults to 'ar' for Oman context.
 */
export async function getLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("locale")?.value;
  if (fromCookie === "en" || fromCookie === "ar") return fromCookie;
  return "ar";
}
