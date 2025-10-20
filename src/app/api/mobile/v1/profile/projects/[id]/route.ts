import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";

const PatchSchema = z.object({
  title: z.string().optional(),
  period: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
});

const mUpdate = fetchMutation as unknown as (
  name: "profiles:updateProject",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

const mDelete = fetchMutation as unknown as (
  name: "profiles:deleteProject",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "PATCH /api/mobile/v1/profile/projects/:id" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const body = await parseJsonBody(req, PatchSchema);
          const res = await mUpdate(
            "profiles:updateProject",
            { id: params.id, ...body },
            { token },
          );
          return NextResponse.json(res);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "project_update_failed",
            "Failed to update project",
            500,
          );
        }
      });
    },
  );
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "DELETE /api/mobile/v1/profile/projects/:id" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const res = await mDelete(
            "profiles:deleteProject",
            { id: params.id },
            { token },
          );
          return NextResponse.json(res);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "project_delete_failed",
            "Failed to delete project",
            500,
          );
        }
      });
    },
  );
}
