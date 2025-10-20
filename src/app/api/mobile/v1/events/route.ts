import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseQuery } from "@/app/api/mobile/_utils/parse-query";
import { isIdCandidate } from "@/app/api/mobile/_utils/id-guards";

const QuerySchema = z.object({
  q: z.string().optional(),
  regionId: z.string().optional(),
  cityId: z.string().optional(),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
  registrationPolicy: z.enum(["open", "approval", "inviteOnly"]).optional(),
  isRegistrationRequired: z.coerce.boolean().optional(),
  allowWaitlist: z.coerce.boolean().optional(),
  capacityMin: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  cursor: z.string().optional(),
});

const callQuery = fetchQuery as unknown as (
  name: "events:listPublicEventsPaginated",
  args: {
    readonly searchText?: string;
    readonly paginationOpts: {
      readonly numItems: number;
      readonly cursor?: string | null;
    };
    readonly locale: "ar" | "en";
    readonly regionId?: string;
    readonly cityId?: string;
    readonly startingDateFrom?: number;
    readonly startingDateTo?: number;
    readonly registrationPolicy?: "open" | "approval" | "inviteOnly";
    readonly isRegistrationRequired?: boolean;
    readonly allowWaitlist?: boolean;
    readonly capacityMin?: number;
  },
  options?: { readonly token?: string },
) => Promise<unknown>;

function pickLocale(req: Request): "ar" | "en" {
  const header = req.headers.get("accept-language")?.toLowerCase() ?? "";
  if (header.startsWith("ar")) return "ar";
  if (header.startsWith("en")) return "en";
  const url = new URL(req.url);
  const qp = (url.searchParams.get("locale") ?? "").toLowerCase();
  if (qp === "en") return "en";
  if (qp === "ar") return "ar";
  return "ar";
}

export async function GET(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/mobile/v1/events" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        // Parse query separately to map Zod validation errors to 400
        let q: z.infer<typeof QuerySchema>;
        try {
          q = parseQuery(req, QuerySchema);
        } catch (err) {
          Sentry.captureException(err);
          Sentry.addBreadcrumb({
            category: "events.query",
            level: "warning",
            message: "query_validation_error",
          });
          return respondError(
            "validation_error",
            "Invalid query parameters",
            400,
          );
        }
        try {
          const locale = pickLocale(req);
          const pageSize = Math.max(1, Math.min(50, q.pageSize ?? 20));
          // Defensive ID handling: drop invalid regionId/cityId before Convex call
          const regionId = isIdCandidate(q.regionId) ? q.regionId : undefined;
          const cityId = isIdCandidate(q.cityId) ? q.cityId : undefined;
          if (q.regionId && !regionId) {
            Sentry.addBreadcrumb({
              category: "events.query",
              level: "info",
              message: "drop_invalid_regionId",
              data: { regionId: q.regionId },
            });
          }
          if (q.cityId && !cityId) {
            Sentry.addBreadcrumb({
              category: "events.query",
              level: "info",
              message: "drop_invalid_cityId",
              data: { cityId: q.cityId },
            });
          }
          const paginationOpts = {
            numItems: pageSize,
            cursor: q.cursor ?? null,
          } as const;
          const result = await callQuery(
            "events:listPublicEventsPaginated",
            {
              searchText: q.q,
              paginationOpts,
              locale,
              regionId,
              cityId,
              startingDateFrom: q.from,
              startingDateTo: q.to,
              registrationPolicy: q.registrationPolicy,
              isRegistrationRequired: q.isRegistrationRequired,
              allowWaitlist: q.allowWaitlist,
              capacityMin: q.capacityMin,
            },
            { token },
          );
          return NextResponse.json(result);
        } catch (err) {
          Sentry.captureException(err);
          const msg = err instanceof Error ? err.message.toLowerCase() : "";
          if (
            msg.includes("unauth") ||
            msg.includes("invalid token") ||
            msg.includes("jwt") ||
            msg.includes("not authorized") ||
            msg.includes("permission")
          ) {
            return respondError("unauthorized", "Unauthorized", 401);
          }
          return respondError(
            "events_list_failed",
            "Failed to list events",
            500,
          );
        }
      });
    },
  );
}
