import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";

const BodySchema = z
  .object({
    learningPathId: z.string().optional(),
    aiSkillId: z.string().optional(),
    moduleId: z.string().min(1),
  })
  .refine((v) => !!v.learningPathId || !!v.aiSkillId, {
    message: "Either learningPathId or aiSkillId is required",
  });

const mIncomplete = fetchMutation as unknown as (
  name: "aiAssessments:markModuleIncomplete",
  args: { readonly learningPathId: string; readonly moduleId: string },
  options?: { readonly token?: string },
) => Promise<unknown>;

const qGetBySkill = fetchQuery as unknown as (
  name: "aiAssessments:getLearningPath",
  args: { readonly aiSkillId: string },
  options?: { readonly token?: string },
) => Promise<null | { readonly _id: string }>;

async function resolveLearningPathId(
  token: string,
  body: z.infer<typeof BodySchema>,
): Promise<string | null> {
  if (body.learningPathId) return body.learningPathId;
  if (body.aiSkillId) {
    const lp = await qGetBySkill(
      "aiAssessments:getLearningPath",
      { aiSkillId: body.aiSkillId },
      { token },
    );
    return lp?._id ?? null;
  }
  return null;
}

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/ai/path/incomplete-module" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const body = await parseJsonBody(req, BodySchema);
          const lpId = await resolveLearningPathId(token, body);
          if (!lpId)
            return respondError(
              "learning_path_not_found",
              "Learning path not found",
              404,
            );
          const result = await mIncomplete(
            "aiAssessments:markModuleIncomplete",
            { learningPathId: lpId, moduleId: body.moduleId },
            { token },
          );
          return NextResponse.json(result);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "ai_incomplete_module_failed",
            "Failed to mark module incomplete",
            500,
          );
        }
      });
    },
  );
}
