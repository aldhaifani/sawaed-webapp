import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";

const qActive = fetchQuery as unknown as (
  name: "aiAssessments:getMyActiveLearningPath",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function GET(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/mobile/v1/ai/path/active" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const result = await qActive(
            "aiAssessments:getMyActiveLearningPath",
            {},
            { token },
          );
          return NextResponse.json(result);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "ai_path_active_failed",
            "Failed to fetch active path",
            500,
          );
        }
      });
    },
  );
}
