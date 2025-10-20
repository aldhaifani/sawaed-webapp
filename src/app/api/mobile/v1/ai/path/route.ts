import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseQuery } from "@/app/api/mobile/_utils/parse-query";

const QuerySchema = z.object({ aiSkillId: z.string() });

const qGet = fetchQuery as unknown as (
  name: "aiAssessments:getLearningPath",
  args: { readonly aiSkillId: string },
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function GET(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/mobile/v1/ai/path" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const q = parseQuery(req, QuerySchema);
          const result = await qGet(
            "aiAssessments:getLearningPath",
            { aiSkillId: q.aiSkillId },
            { token },
          );
          return NextResponse.json(result);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "ai_path_get_failed",
            "Failed to fetch learning path",
            500,
          );
        }
      });
    },
  );
}
