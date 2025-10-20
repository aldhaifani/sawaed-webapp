import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";

const qGetConfig = fetchQuery as unknown as (
  name: "aiChatConfigs:getMyChatConfig",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

const mUpsertConfig = fetchMutation as unknown as (
  name: "aiChatConfigs:upsertMyChatConfig",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

// no locale selection needed in this route

const UpsertSchema = z.object({
  aiSkillId: z.string().optional(),
  preferredLanguage: z.union([z.literal("ar"), z.literal("en")]),
  systemPrompt: z.string().optional(),
});

export async function GET(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/mobile/v1/ai/config" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          // getMyChatConfig takes no args; pass an empty object
          const result = await qGetConfig(
            "aiChatConfigs:getMyChatConfig",
            {},
            { token },
          );
          if (!result) {
            Sentry.addBreadcrumb({
              category: "ai.config",
              level: "info",
              message: "get_forbidden_null",
            });
            return respondError("forbidden", "Forbidden", 403);
          }
          return NextResponse.json(result);
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "ai_config_fetch_failed",
            "Failed to fetch AI config",
            500,
          );
        }
      });
    },
  );
}

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/ai/config" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const body = await parseJsonBody(req, UpsertSchema);
          const result = await mUpsertConfig(
            "aiChatConfigs:upsertMyChatConfig",
            {
              aiSkillId: body.aiSkillId,
              preferredLanguage: body.preferredLanguage,
              systemPrompt: body.systemPrompt,
            },
            { token },
          );
          return NextResponse.json(result);
        } catch (err) {
          Sentry.captureException(err);
          Sentry.addBreadcrumb({
            category: "ai.config",
            level: "warning",
            message: "upsert_validation_or_server_error",
          });
          return respondError(
            "ai_config_upsert_failed",
            "Failed to upsert AI config",
            500,
          );
        }
      });
    },
  );
}
