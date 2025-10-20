import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { rateLimitCheck } from "@/app/api/mobile/_utils/rate-limit";

const callMutation = fetchMutation as unknown as (
  name: "eventRegistrations:cancelMyRegistration",
  args: { readonly eventId: string },
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function POST(
  req: Request,
  ctx: { params: { id: string } },
): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/events/:id/cancel" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        const rl = rateLimitCheck({
          token,
          key: "mobile:events:cancel",
          limit: 5,
          windowMs: 10_000,
        });
        if (!rl.ok) return rl.response;
        try {
          const { id } = ctx.params;
          const result = await callMutation(
            "eventRegistrations:cancelMyRegistration",
            { eventId: id },
            { token },
          );
          return NextResponse.json(result);
        } catch (err: unknown) {
          Sentry.captureException(err);
          const code =
            err instanceof Error && typeof err.message === "string"
              ? err.message
              : "cancel_failed";
          const conflictCodes = new Set(["NOT_REGISTERED"]);
          const status = conflictCodes.has(code) ? 409 : 400;
          return respondError(code.toLowerCase(), code, status);
        }
      });
    },
  );
}
