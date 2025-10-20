import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";

const BodySchema = z.object({ step: z.string() });

const callMutation = fetchMutation as unknown as (
  name: "onboarding:setStep",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/onboarding/step" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const body = await parseJsonBody(req, BodySchema);
          const ok = (await callMutation(
            "onboarding:setStep",
            { step: body.step },
            { token },
          )) as boolean;
          if (!ok) return respondError("forbidden", "Forbidden", 403);
          return NextResponse.json({ ok: true });
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "onboarding_set_step_failed",
            "Failed to set step",
            500,
          );
        }
      });
    },
  );
}
