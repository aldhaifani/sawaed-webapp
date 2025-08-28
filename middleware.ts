import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import * as Sentry from "@sentry/nextjs";

const LOCALE_COOKIE = "locale" as const;
const DEFAULT_LOCALE = "ar" as const;
const LOCALE_PREFIXES = ["/ar", "/en"] as const;

const nextIntlMiddleware = createIntlMiddleware(routing);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    return Sentry.startSpan(
      {
        op: "middleware",
        name: "convex-auth-middleware",
      },
      async (span) => {
        try {
          const { nextUrl, cookies } = request;
          const { pathname } = nextUrl;
          const method = request.method;

          // Add span attributes for debugging
          span.setAttribute("http.method", method);
          span.setAttribute("url.pathname", pathname);

          // Bypass middleware for analytics/monitoring proxy endpoints
          if (
            pathname === "/ingest" ||
            pathname.startsWith("/ingest/") ||
            pathname === "/monitoring" ||
            pathname.startsWith("/monitoring/")
          ) {
            return NextResponse.next();
          }

          // Check if this is an API-like route or non-GET request
          const isApiLike =
            pathname.startsWith("/api") ||
            pathname.startsWith("/trpc") ||
            pathname.startsWith("/_next") ||
            pathname === "/favicon.ico";

          span.setAttribute("route.isApiLike", isApiLike);

          // Never redirect for API-like routes or non-GET requests
          if (isApiLike || method !== "GET") {
            return NextResponse.next();
          }

          // Check if this is an auth page (with or without locale prefix)
          const isAuthPage =
            pathname.startsWith("/auth") ||
            pathname.includes("/auth/") ||
            pathname.startsWith("/ar/auth") ||
            pathname.includes("/ar/auth/") ||
            pathname.startsWith("/en/auth") ||
            pathname.includes("/en/auth/");

          // Check authentication status
          const isAuthenticated = await convexAuth.isAuthenticated();

          // Add more span attributes for debugging
          span.setAttribute("page.isAuth", isAuthPage);
          span.setAttribute("user.isAuthenticated", isAuthenticated);

          // Get the current locale for redirects
          const cookieLocale = cookies.get(LOCALE_COOKIE)?.value;
          const redirectLocale =
            cookieLocale === "en" || cookieLocale === "ar"
              ? cookieLocale
              : DEFAULT_LOCALE;

          // If not signed in and not already on /auth, redirect to /auth with locale
          if (!isAuthenticated && !isAuthPage) {
            return NextResponse.redirect(
              new URL(`/${redirectLocale}/auth`, request.url),
            );
          }

          // If signed in and on /auth, redirect to home with locale
          if (isAuthenticated && isAuthPage) {
            return NextResponse.redirect(
              new URL(`/${redirectLocale}`, request.url),
            );
          }

          // Run next-intl middleware first to set request locale based on the current pathname
          const intlResponse = nextIntlMiddleware(request);

          // Backward-compat: rewrite legacy admin/super-admin/auth paths to locale-prefixed versions
          if (pathname === "/a" || pathname.startsWith("/a/")) {
            const url = nextUrl.clone();
            url.pathname = `/${redirectLocale}${pathname}`; // e.g., /en/a or /en/a/...
            return NextResponse.rewrite(url);
          }
          if (pathname === "/sa" || pathname.startsWith("/sa/")) {
            const url = nextUrl.clone();
            url.pathname = `/${redirectLocale}${pathname}`;
            return NextResponse.rewrite(url);
          }
          if (pathname === "/auth" || pathname.startsWith("/auth/")) {
            const url = nextUrl.clone();
            url.pathname = `/${redirectLocale}${pathname}`;
            return NextResponse.rewrite(url);
          }

          // Sync cookie from explicit locale prefix
          const matchedPrefix = LOCALE_PREFIXES.find(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
          );
          if (matchedPrefix) {
            const matchedLocale = matchedPrefix.slice(1); // 'ar' | 'en'
            const res = intlResponse; // base response from next-intl
            const current = cookies.get(LOCALE_COOKIE)?.value;
            if (current !== matchedLocale) {
              res.cookies.set(LOCALE_COOKIE, matchedLocale, {
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
            url.pathname = `/${redirectLocale}`;
            const res = NextResponse.redirect(url);
            if (!cookies.has(LOCALE_COOKIE)) {
              res.cookies.set(LOCALE_COOKIE, redirectLocale, {
                httpOnly: false,
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 24 * 365,
              });
            }
            return res;
          }

          // If path has no locale prefix, rewrite to locale-prefixed path to keep routing under [locale]
          // This ensures 404s are handled by src/app/[locale]/not-found.tsx instead of the global default
          if (
            !LOCALE_PREFIXES.some(
              (p) => pathname === p || pathname.startsWith(`${p}/`),
            )
          ) {
            const url = nextUrl.clone();
            url.pathname = `/${redirectLocale}${pathname}`;
            const res = NextResponse.rewrite(url);
            if (!cookies.has(LOCALE_COOKIE)) {
              res.cookies.set(LOCALE_COOKIE, redirectLocale, {
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
        } catch (err) {
          Sentry.captureException(err);
          throw err;
        }
      },
    );
  },
  {
    // Ensure Convex Auth middleware processes API auth endpoints
    apiRoute: "/api/auth",
  },
);

export const config = {
  // Include Convex Auth API routes explicitly and app routes; exclude Next internals and other APIs/TRPC
  matcher: [
    // Run on all non-static, non-API/TRPC routes
    "/((?!.*\\..*|_next|api|trpc).*)",
    "/",
    // Explicitly include Convex Auth API endpoints so middleware can proxy POSTs
    "/api/auth",
    "/api/auth/",
    "/api/auth/:path*",
  ],
};
