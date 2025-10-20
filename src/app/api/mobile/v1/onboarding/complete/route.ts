import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";

const qGetDraft = fetchQuery as unknown as (
  name: "onboarding:getDraft",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<{
  firstNameAr?: string;
  lastNameAr?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  gender?: "male" | "female";
  city?: string;
  region?: string;
  regionId?: string;
  cityId?: string;
  draftSkillIds?: readonly string[];
  draftInterestIds?: readonly string[];
} | null>;

const mUpsert = fetchMutation as unknown as (
  name: "onboarding:upsertBasicDetails",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

const mSetTax = fetchMutation as unknown as (
  name: "onboarding:setUserTaxonomies",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<{ skills: number; interests: number }>;

const mComplete = fetchMutation as unknown as (
  name: "onboarding:complete",
  args: unknown,
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

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/onboarding/complete" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        try {
          const draft = await qGetDraft("onboarding:getDraft", {}, { token });
          if (!draft) return respondError("forbidden", "Forbidden", 403);
          const locale = pickLocale(req);
          // Validate required draft fields
          if (
            !draft.firstNameAr ||
            !draft.lastNameAr ||
            !draft.firstNameEn ||
            !draft.lastNameEn ||
            !draft.gender ||
            !draft.city ||
            !draft.region
          ) {
            return respondError("invalid_draft", "Draft is incomplete", 400);
          }
          await mUpsert(
            "onboarding:upsertBasicDetails",
            {
              firstNameAr: draft.firstNameAr,
              lastNameAr: draft.lastNameAr,
              firstNameEn: draft.firstNameEn,
              lastNameEn: draft.lastNameEn,
              gender: draft.gender,
              city: draft.city,
              region: draft.region,
              locale,
              cityId: draft.cityId,
              regionId: draft.regionId,
            },
            { token },
          );
          await mSetTax(
            "onboarding:setUserTaxonomies",
            {
              skillIds: draft.draftSkillIds ?? [],
              interestIds: draft.draftInterestIds ?? [],
            },
            { token },
          );
          await mComplete("onboarding:complete", {}, { token });
          return NextResponse.json({ ok: true });
        } catch (err) {
          Sentry.captureException(err);
          return respondError(
            "onboarding_complete_failed",
            "Failed to complete onboarding",
            500,
          );
        }
      });
    },
  );
}
