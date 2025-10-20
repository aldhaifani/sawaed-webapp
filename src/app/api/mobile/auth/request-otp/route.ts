import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
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
        await callAction("auth:signIn", args);
        return NextResponse.json({ ok: true });
      } catch (err) {
        Sentry.captureException(err);
        const message =
          err instanceof Error ? err.message : "request_otp_failed";
        return respondError("request_otp_failed", message, 400);
      }
    },
  );
}
