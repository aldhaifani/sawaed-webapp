import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";

const BodySchema = z.object({
  skillIds: z.array(z.string()),
  interestIds: z.array(z.string()),
});

const callMutation = fetchMutation as unknown as (
  name: "onboarding:saveDraftTaxonomies",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    {
      op: "http.route",
      name: "POST /api/mobile/v1/onboarding/save-draft-taxonomies",
    },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const body = await parseJsonBody(req, BodySchema);
          const ok = (await callMutation(
            "onboarding:saveDraftTaxonomies",
            {
              skillIds: body.skillIds,
              interestIds: body.interestIds,
            },
            { token },
          )) as boolean;
          if (!ok) return respondError("forbidden", "Forbidden", 403);
          return NextResponse.json({ ok: true });
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "onboarding_save_taxonomies_failed",
            "Failed to save taxonomies",
            500,
          );
        }
      });
    },
  );
}
