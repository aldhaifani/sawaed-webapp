import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";

const BodySchema = z.object({
  firstNameAr: z.string().min(1),
  lastNameAr: z.string().min(1),
  firstNameEn: z.string().min(1),
  lastNameEn: z.string().min(1),
  gender: z.union([z.literal("male"), z.literal("female")]),
  region: z.string().min(1),
  city: z.string().min(1),
  regionId: z.string().optional(),
  cityId: z.string().optional(),
});

const callMutation = fetchMutation as unknown as (
  name: "onboarding:saveDraftDetails",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    {
      op: "http.route",
      name: "POST /api/mobile/v1/onboarding/save-draft-details",
    },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const body = await parseJsonBody(req, BodySchema);
          const ok = (await callMutation(
            "onboarding:saveDraftDetails",
            {
              firstNameAr: body.firstNameAr,
              lastNameAr: body.lastNameAr,
              firstNameEn: body.firstNameEn,
              lastNameEn: body.lastNameEn,
              gender: body.gender,
              city: body.city,
              region: body.region,
              cityId: body.cityId,
              regionId: body.regionId,
            },
            { token },
          )) as boolean;
          if (!ok) return respondError("forbidden", "Forbidden", 403);
          return NextResponse.json({ ok: true });
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "onboarding_save_details_failed",
            "Failed to save details",
            500,
          );
        }
      });
    },
  );
}
