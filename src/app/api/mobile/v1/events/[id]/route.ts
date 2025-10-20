import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { isIdCandidate } from "@/app/api/mobile/_utils/id-guards";

const callQuery = fetchQuery as unknown as (
  name: "events:getPublicEventById",
  args: { readonly id: string; readonly locale: "ar" | "en" },
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

function isValidationError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("validation") ||
    msg.includes("validator") ||
    msg.includes("expected") ||
    msg.includes("invalid")
  );
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/mobile/v1/events/:id" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          if (!isIdCandidate(params.id)) {
            Sentry.addBreadcrumb({
              category: "events.detail",
              level: "info",
              message: "invalid_id_format",
              data: { id: params.id },
            });
            return respondError("invalid_id", "Invalid event id", 400);
          }
          const locale = pickLocale(req);
          const result = await callQuery(
            "events:getPublicEventById",
            { id: params.id, locale },
            { token },
          );
          if (!result) return respondError("not_found", "Event not found", 404);
          return NextResponse.json(result);
        } catch (err) {
          Sentry.captureException(err);
          if (isValidationError(err)) {
            return respondError("invalid_id", "Invalid event id", 400);
          }
          return respondError("event_get_failed", "Failed to fetch event", 500);
        }
      });
    },
  );
}
