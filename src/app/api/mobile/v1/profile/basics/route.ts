import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";
import { rateLimitCheck } from "@/app/api/mobile/_utils/rate-limit";

const BodySchema = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),
  regionId: z.string().optional(),
  cityId: z.string().optional(),
  pictureUrl: z.string().url().optional(),
  collaborationStatus: z.enum(["open", "closed", "looking"]).optional(),
});

const callMutation = fetchMutation as unknown as (
  name: "profiles:updateProfileBasics",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/profile/basics" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        const rl = rateLimitCheck({
          token,
          key: "mobile:profile:basics",
          limit: 10,
          windowMs: 10_000,
        });
        if (!rl.ok) return rl.response;
        try {
          const body = await parseJsonBody(req, BodySchema);
          const res = await callMutation(
            "profiles:updateProfileBasics",
            {
              headline: body.headline,
              bio: body.bio,
              regionId: body.regionId,
              cityId: body.cityId,
              pictureUrl: body.pictureUrl,
              collaborationStatus: body.collaborationStatus,
            },
            { token },
          );
          return NextResponse.json(res);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "profile_basics_failed",
            "Failed to update basics",
            500,
          );
        }
      });
    },
  );
}
