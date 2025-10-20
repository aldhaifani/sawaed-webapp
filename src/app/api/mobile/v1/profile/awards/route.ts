import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";

const BodySchema = z.object({
  title: z.string().min(1),
  issuer: z.string().optional(),
  year: z.number().optional(),
});

const callMutation = fetchMutation as unknown as (
  name: "profiles:createAward",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/profile/awards" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const body = await parseJsonBody(req, BodySchema);
          const res = await callMutation("profiles:createAward", body, {
            token,
          });
          return NextResponse.json(res);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "award_create_failed",
            "Failed to create award",
            500,
          );
        }
      });
    },
  );
}
