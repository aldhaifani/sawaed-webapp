import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";

const callQuery = fetchQuery as unknown as (
  name: "onboarding:getStatus",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function GET(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/mobile/v1/onboarding/status" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const result = (await callQuery(
            "onboarding:getStatus",
            {},
            { token },
          )) as { completed: boolean; currentStep?: string } | null;
          if (!result) return respondError("forbidden", "Forbidden", 403);
          return NextResponse.json(result);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "onboarding_status_failed",
            "Failed to fetch status",
            500,
          );
        }
      });
    },
  );
}
