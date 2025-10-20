import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";

const qSkills = fetchQuery as unknown as (
  name: "aiAssessments:getSkills",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function GET(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/mobile/v1/ai/skills" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const result = await qSkills(
            "aiAssessments:getSkills",
            {},
            { token },
          );
          return NextResponse.json({ items: result });
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "ai_skills_fetch_failed",
            "Failed to fetch AI skills",
            500,
          );
        }
      });
    },
  );
}
