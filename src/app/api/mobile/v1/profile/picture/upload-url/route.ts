import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";

const callAction = fetchAction as unknown as (
  name: "profiles:generateProfilePictureUploadUrl",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function GET(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/mobile/v1/profile/picture/upload-url" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const res = (await callAction(
            "profiles:generateProfilePictureUploadUrl",
            {},
            { token },
          )) as { uploadUrl?: string } | null;
          if (!res?.uploadUrl)
            return respondError("forbidden", "Forbidden", 403);
          return NextResponse.json(res);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "profile_picture_upload_url_failed",
            "Failed to generate upload URL",
            500,
          );
        }
      });
    },
  );
}
