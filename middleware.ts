import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const LOCALE_COOKIE = "locale" as const;
const DEFAULT_LOCALE = "ar" as const;
const LOCALE_PREFIXES = ["/ar", "/en"] as const;

const nextIntlMiddleware = createIntlMiddleware(routing);

export const middleware = convexAuthNextjsMiddleware(
  (request: NextRequest) => {
    const { nextUrl, cookies } = request;
    const { pathname } = nextUrl;
    // Bypass middleware for analytics/monitoring proxy endpoints
    if (
      pathname === "/ingest" ||
      pathname.startsWith("/ingest/") ||
      pathname === "/monitoring" ||
      pathname.startsWith("/monitoring/")
    ) {
      return NextResponse.next();
    }
    // Run next-intl middleware first to set request locale based on the current pathname
    const intlResponse = nextIntlMiddleware(request);

    // Backward-compat: rewrite legacy admin/super-admin/auth paths to locale-prefixed versions
    const cookieLocale = cookies.get(LOCALE_COOKIE)?.value;
    const locale =
      cookieLocale === "en" || cookieLocale === "ar"
        ? cookieLocale
        : DEFAULT_LOCALE;
    if (pathname === "/a" || pathname.startsWith("/a/")) {
      const url = nextUrl.clone();
      url.pathname = `/${locale}${pathname}`; // e.g., /en/a or /en/a/...
      return NextResponse.rewrite(url);
    }
    if (pathname === "/sa" || pathname.startsWith("/sa/")) {
      const url = nextUrl.clone();
      url.pathname = `/${locale}${pathname}`;
      return NextResponse.rewrite(url);
    }
    if (pathname === "/auth" || pathname.startsWith("/auth/")) {
      const url = nextUrl.clone();
      url.pathname = `/${locale}${pathname}`;
      return NextResponse.rewrite(url);
    }

    // Sync cookie from explicit locale prefix
    const matchedPrefix = LOCALE_PREFIXES.find(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (matchedPrefix) {
      const locale = matchedPrefix.slice(1); // 'ar' | 'en'
      const res = intlResponse; // base response from next-intl
      const current = cookies.get(LOCALE_COOKIE)?.value;
      if (current !== locale) {
        res.cookies.set(LOCALE_COOKIE, locale, {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        });
      }
      return res;
    }

    // If no locale segment and visiting root, rewrite to cookie locale or default (youth landing)
    if (pathname === "/") {
      const url = nextUrl.clone();
      const target = locale;
      url.pathname = `/${target}`;
      const res = NextResponse.rewrite(url);
      if (!cookies.has(LOCALE_COOKIE)) {
        res.cookies.set(LOCALE_COOKIE, target, {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        });
      }
      return res;
    }

    // Default behavior
    const res = intlResponse; // continue with the next-intl response
    if (!cookies.has(LOCALE_COOKIE)) {
      res.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  },
  { apiRoute: "/api/auth" },
);

export const config = {
  // Include Convex Auth API route and app routes; exclude Next internals and static assets
  matcher: [
    "/api/auth/:path*",
    "/((?!_next/|favicon.ico|logo.png|logo.svg|ingest|monitoring).*)",
  ],
};
