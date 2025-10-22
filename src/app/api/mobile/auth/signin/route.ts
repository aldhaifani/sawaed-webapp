import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { fetchAction } from "convex/nextjs";
import { isCorsRequest } from "@/app/api/mobile/_utils/is-cors-request";

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type Tokens = { readonly token: string; readonly refreshToken: string };

type SignInTokensResult = { readonly tokens: Tokens | null } | null;

type AuthAction = "auth:signIn";

const callAction = fetchAction as unknown as (
  name: AuthAction,
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTokens(value: unknown): value is Tokens {
  return (
    isObject(value) &&
    typeof value.token === "string" &&
    typeof value.refreshToken === "string"
  );
}

function extractTokens(result: unknown): Tokens | null {
  if (isObject(result) && "tokens" in result) {
    const maybe = (result as SignInTokensResult)?.tokens ?? null;
    return maybe && isTokens(maybe) ? maybe : null;
  }
  return null;
}

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/auth/signin" },
    async () => {
      try {
        if (isCorsRequest(req)) {
          return new Response("Invalid origin", { status: 403 });
        }
        const body = await parseJsonBody(req, SignInSchema);
        // Email/password primary sign-in; Convex Password provider requires a `flow` param
        const args = {
          provider: "password",
          params: {
            email: body.email,
            password: body.password,
            flow: "signIn",
          },
        };
        const result = await callAction("auth:signIn", args);
        const tokens = extractTokens(result);
        if (!tokens) {
          return respondError(
            "invalid_credentials_or_unverified",
            "Invalid credentials or email not verified",
            401,
          );
        }
        return NextResponse.json(tokens);
      } catch (err) {
        Sentry.captureException(err);
        // Do not leak provider/internal errors to clients
        return respondError(
          "invalid_credentials_or_unverified",
          "Invalid credentials or email not verified",
          401,
        );
      }
    },
  );
}
