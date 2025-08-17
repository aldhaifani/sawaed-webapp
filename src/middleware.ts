import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  return Sentry.startSpan(
    {
      op: "middleware",
      name: "convex-auth-middleware",
    },
    async (span) => {
      try {
        const { pathname } = request.nextUrl;
        const method = request.method;
        const isAuthPage: boolean = pathname.startsWith("/auth");
        const isApiLike: boolean =
          pathname.startsWith("/api") ||
          pathname.startsWith("/trpc") ||
          pathname.startsWith("/_next") ||
          pathname === "/favicon.ico";

        span.setAttribute("http.method", method);
        span.setAttribute("url.pathname", pathname);
        span.setAttribute("page.isAuth", isAuthPage);
        span.setAttribute("route.isApiLike", isApiLike);

        // Never redirect for API-like routes or non-GET requests
        if (isApiLike || method !== "GET") {
          return NextResponse.next();
        }

        const isAuthenticated = await convexAuth.isAuthenticated();
        span.setAttribute("user.isAuthenticated", isAuthenticated);

        // If not signed in and not already on /auth, redirect to /auth
        if (!isAuthenticated && !isAuthPage) {
          return NextResponse.redirect(new URL("/auth", request.url));
        }

        // If signed in and on /auth, redirect to home
        if (isAuthenticated && isAuthPage) {
          return NextResponse.redirect(new URL("/", request.url));
        }

        return NextResponse.next();
      } catch (err) {
        Sentry.captureException(err);
        throw err;
      }
    },
  );
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  // Exclude API and TRPC entirely to avoid interfering with auth/actions
  matcher: [
    // Allow convex-auth to proxy /api/auth
    "/api/auth",
    "/api/auth/",
    // Run on all non-static, non-API/TRPC routes
    "/((?!.*\\..*|_next|api|trpc).*)",
    "/",
  ],
};
