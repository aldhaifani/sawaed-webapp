import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { ERROR_CODES } from "@/app/api/mobile/_utils/error-codes";
import { fetchAction } from "convex/nextjs";
import { isCorsRequest } from "@/app/api/mobile/_utils/is-cors-request";

const RequestOtpSchema = z.object({ email: z.string().email() });

type AuthAction = "auth:signIn";

const callAction = fetchAction as unknown as (
  name: AuthAction,
  args: unknown,
) => Promise<unknown>;

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/auth/request-otp" },
    async () => {
      try {
        if (isCorsRequest(req)) {
          return new Response("Invalid origin", { status: 403 });
        }
        const body = await parseJsonBody(req, RequestOtpSchema);
        const args = { provider: "resend-otp", params: { email: body.email } };
        const span = Sentry.getActiveSpan();
        span?.setAttribute("branch", "request_otp_attempt");
        await callAction("auth:signIn", args);
        span?.setAttribute("result", "user_unverified_otp_sent");
        return NextResponse.json({
          ok: true,
          code: ERROR_CODES.userUnverified,
        });
      } catch (err) {
        Sentry.captureException(err);
        const span = Sentry.getActiveSpan();
        const message =
          err instanceof Error ? err.message : "request_otp_failed";
        const lower = (message ?? "").toLowerCase();
        if (/verified|already\s*verified|exists/.test(lower)) {
          span?.setAttribute("result", "user_exists_verified");
          return respondError(
            ERROR_CODES.userExists,
            "User already exists",
            409,
          );
        }
        if (/not\s*found|no\s*user/i.test(message ?? "")) {
          span?.setAttribute("result", "no_user_normal_ok");
          return NextResponse.json({ ok: true });
        }
        span?.setAttribute("result", "request_otp_failed");
        return respondError("request_otp_failed", message, 400);
      }
    },
  );
}
