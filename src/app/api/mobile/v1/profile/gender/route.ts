import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";

const BodySchema = z.object({ gender: z.enum(["male", "female"]) });

const callMutation = fetchMutation as unknown as (
  name: "profiles:updateUserGender",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/profile/gender" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const body = await parseJsonBody(req, BodySchema);
          const res = await callMutation(
            "profiles:updateUserGender",
            { gender: body.gender },
            { token },
          );
          return NextResponse.json(res);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "profile_gender_failed",
            "Failed to update gender",
            500,
          );
        }
      });
    },
  );
}
