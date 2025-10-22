import { type NextRequest, NextResponse } from "next/server";
import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import { fetchAction } from "convex/nextjs";

// ===== Types =====
type AuthAction = "auth:signIn" | "auth:signOut";

type SignInArgs = {
  readonly refreshToken?: string;
  readonly params?: { readonly code?: string };
  readonly [key: string]: unknown;
};

type TokensPayload = { readonly token: string; readonly refreshToken: string };

type SignInResult =
  | { readonly redirect: string; readonly verifier: string | null }
  | { readonly tokens: TokensPayload | null }
  | null;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasString(obj: unknown, key: string): obj is Record<string, string> {
  return isObject(obj) && typeof obj[key] === "string";
}

function isTokensPayload(value: unknown): value is TokensPayload {
  return (
    isObject(value) &&
    typeof value.token === "string" &&
    typeof value.refreshToken === "string"
  );
}

function isRedirectResult(
  value: unknown,
): value is { redirect: string; verifier: string | null } {
  return (
    isObject(value) &&
    typeof value.redirect === "string" &&
    (typeof value.verifier === "string" || value.verifier === null)
  );
}

function isTokensResult(
  value: unknown,
): value is { tokens: TokensPayload | null } {
  return (
    isObject(value) && (value.tokens === null || isTokensPayload(value.tokens))
  );
}

// Narrowed wrapper for fetchAction to avoid `any` while remaining flexible
const callAction = fetchAction as unknown as (
  name: AuthAction,
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

// Helper: detect localhost to decide cookie prefix and secure flag
function isLocalHost(host: string): boolean {
  return (
    host?.includes("localhost") ||
    host?.includes("127.0.0.1") ||
    host?.includes("::1")
  );
}

function getCookieNames(host: string) {
  const prefix = isLocalHost(host) ? "" : "__Host-";
  return {
    token: `${prefix}__convexAuthJWT`,
    refreshToken: `${prefix}__convexAuthRefreshToken`,
    verifier: `${prefix}__convexAuthOAuthVerifier`,
  };
}

function getCookieOptions(host: string) {
  const secure = isLocalHost(host) ? false : true;
  return {
    secure,
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/" as const,
  };
}

function isCorsRequest(request: NextRequest): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  const originURL = new URL(origin);
  const reqURL = new URL(request.url);
  return (
    originURL.host !== reqURL.host || originURL.protocol !== reqURL.protocol
  );
}

export async function POST(request: NextRequest) {
  // CORS protection similar to convex-auth
  if (isCorsRequest(request)) {
    return new Response("Invalid origin", { status: 403 });
  }

  // Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { action, args } = (body ?? {}) as {
    action?: AuthAction;
    args?: Record<string, unknown>;
  };

  if (action !== "auth:signIn" && action !== "auth:signOut") {
    return new Response("Invalid action", { status: 400 });
  }

  const hdrs = await nextHeaders();
  const host = hdrs.get("Host") ?? "localhost";
  const names = getCookieNames(host);
  const cookieOpts = getCookieOptions(host);

  const cookieStore = await nextCookies();

  const getReqCookie = (name: string): string | null =>
    cookieStore.get(name)?.value ?? null;

  const setResCookie = (
    res: NextResponse,
    name: string,
    value: string | null,
  ) => {
    if (value === null) {
      // Clear cookie (works for both node and edge)
      res.cookies.set(name, "", {
        ...cookieOpts,
        maxAge: undefined,
        expires: 0,
      });
    } else {
      res.cookies.set(name, value, cookieOpts);
    }
  };

  if (action === "auth:signIn") {
    const callArgs: SignInArgs = { ...(args ?? {}) };

    let token: string | undefined = undefined;

    // If refreshing tokens or validating a code, don't require auth
    const isRefreshOrCode =
      callArgs.refreshToken !== undefined ||
      callArgs.params?.code !== undefined;

    let effectiveArgs: SignInArgs = callArgs;
    if (callArgs.refreshToken !== undefined) {
      // Replace dummy refresh token with real one from cookie
      const refresh = getReqCookie(names.refreshToken);
      if (refresh === null) {
        // Match convex-auth behavior
        return NextResponse.json({ tokens: null });
      }
      effectiveArgs = { ...callArgs, refreshToken: refresh };
    } else if (!isRefreshOrCode) {
      // Propagate auth if already signed in
      const existing = getReqCookie(names.token);
      token = existing ?? undefined;
    }

    try {
      const resultUnknown = await callAction("auth:signIn", effectiveArgs, {
        ...(isRefreshOrCode ? {} : token ? { token } : {}),
      });

      if (isRedirectResult(resultUnknown)) {
        const res = NextResponse.json({ redirect: resultUnknown.redirect });
        // Store verifier for oauth/magic link
        setResCookie(res, names.verifier, resultUnknown.verifier);
        return res;
      }

      if (isTokensResult(resultUnknown)) {
        const tokens = resultUnknown.tokens;
        const res = NextResponse.json({
          tokens:
            tokens !== null
              ? { token: tokens.token, refreshToken: "dummy" }
              : null,
        });
        // Persist tokens to cookies (note: real refreshToken is stored httpOnly)
        setResCookie(res, names.token, tokens?.token ?? null);
        setResCookie(res, names.refreshToken, tokens?.refreshToken ?? null);
        // Clear verifier
        setResCookie(res, names.verifier, null);
        return res;
      }

      // Fallback passthrough
      return NextResponse.json((resultUnknown as SignInResult) ?? null);
    } catch (err: unknown) {
      // Do not leak internal error details (e.g., provider stack traces)
      const res = NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
      // Clear tokens on error
      setResCookie(res, names.token, null);
      setResCookie(res, names.refreshToken, null);
      setResCookie(res, names.verifier, null);
      return res;
    }
  } else {
    // auth:signOut
    try {
      const token = getReqCookie(names.token) ?? undefined;
      await callAction("auth:signOut", args ?? {}, {
        ...(token ? { token } : {}),
      });
    } catch {
      // ignore errors during signOut
    }
    const res = NextResponse.json(null);
    // Clear tokens
    const clear = (name: string) => {
      res.cookies.set(name, "", {
        ...cookieOpts,
        maxAge: undefined,
        expires: 0,
      });
    };
    clear(names.token);
    clear(names.refreshToken);
    clear(names.verifier);
    return res;
  }
}

// Explicit 405s for other methods
export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}
export async function PUT() {
  return new Response("Method Not Allowed", { status: 405 });
}
export async function PATCH() {
  return new Response("Method Not Allowed", { status: 405 });
}
export async function DELETE() {
  return new Response("Method Not Allowed", { status: 405 });
}
