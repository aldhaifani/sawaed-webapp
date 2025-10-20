import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseQuery } from "@/app/api/mobile/_utils/parse-query";

const QuerySchema = z.object({ regionId: z.string().optional() });

const callQuery = fetchQuery as unknown as (
  name: "locations:listCitiesByRegion",
  args: { readonly regionId?: string; readonly locale: "ar" | "en" },
  options?: { readonly token?: string },
) => Promise<readonly { id: string; name: string }[]>;

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
    { op: "http.route", name: "GET /api/mobile/v1/locations/cities" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const q = parseQuery(req, QuerySchema);
          const locale = pickLocale(req);
          const items = await callQuery(
            "locations:listCitiesByRegion",
            { regionId: q.regionId, locale },
            { token },
          );
          return NextResponse.json({ items });
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "cities_fetch_failed",
            "Failed to fetch cities",
            500,
          );
        }
      });
    },
  );
}
