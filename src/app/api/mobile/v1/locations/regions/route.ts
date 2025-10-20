import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";

const callQuery = fetchQuery as unknown as (
  name: "locations:listRegions",
  args: { readonly locale: "ar" | "en" },
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
    { op: "http.route", name: "GET /api/mobile/v1/locations/regions" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const locale = pickLocale(req);
          const items = await callQuery(
            "locations:listRegions",
            { locale },
            { token },
          );
          return NextResponse.json({ items });
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "regions_fetch_failed",
            "Failed to fetch regions",
            500,
          );
        }
      });
    },
  );
}
