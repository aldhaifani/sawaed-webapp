import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { ERROR_CODES } from "@/app/api/mobile/_utils/error-codes";
import { fetchAction } from "convex/nextjs";
import { isCorsRequest } from "@/app/api/mobile/_utils/is-cors-request";

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type AuthAction = "auth:signIn";

const callAction = fetchAction as unknown as (
  name: AuthAction,
  args: unknown,
) => Promise<unknown>;

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/auth/signup" },
    async () => {
      try {
        if (isCorsRequest(req)) {
          return new Response("Invalid origin", { status: 403 });
        }
        const body = await parseJsonBody(req, SignUpSchema);
        // Create account via Convex password provider sign-up flow
        const args = {
          provider: "password",
          params: {
            email: body.email,
            password: body.password,
            flow: "signUp",
          },
        } as const;
        const span = Sentry.getActiveSpan();
        span?.setAttribute("branch", "signup_attempt");
        await callAction("auth:signIn", args);
        // For sign-up we do not return tokens yet; user must verify email via OTP
        return NextResponse.json({ ok: true });
      } catch (err) {
        Sentry.captureException(err);
        const span = Sentry.getActiveSpan();
        const message = err instanceof Error ? err.message : String(err);
        const duplicate = /exist|already|duplicate|taken/i.test(message ?? "");
        if (duplicate) {
          span?.setAttribute("result", "email_already_exists");
          return respondError(
            ERROR_CODES.emailAlreadyExists,
            "Email already in use",
            409,
          );
        }
        span?.setAttribute("result", "signup_failed");
        // Normalize errors; do not leak provider/internal messages
        return respondError(
          "signup_failed",
          "Unable to create account. Please try again later.",
          400,
        );
      }
    },
  );
}
