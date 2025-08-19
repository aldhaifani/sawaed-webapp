import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const AppLocale = v.union(v.literal("ar"), v.literal("en"));

function choose(
  locale: "ar" | "en",
  ar: string | null | undefined,
  en: string | null | undefined,
): string {
  const arVal = (ar ?? "").trim();
  const enVal = (en ?? "").trim();
  if (locale === "ar") return arVal || enVal;
  return enVal || arVal;
}

export const listSkillsLocalized = query({
  args: { locale: AppLocale },
  handler: async (
    ctx,
    { locale },
  ): Promise<Array<{ id: Id<"skills">; name: string }>> => {
    const rows = await ctx.db.query("skills").collect();
    return rows.map((r) => ({
      id: r._id,
      name: choose(locale, r.nameAr, r.nameEn),
    }));
  },
});

export const listInterestsLocalized = query({
  args: { locale: AppLocale },
  handler: async (
    ctx,
    { locale },
  ): Promise<Array<{ id: Id<"interests">; name: string }>> => {
    const rows = await ctx.db.query("interests").collect();
    return rows.map((r) => ({
      id: r._id,
      name: choose(locale, r.nameAr, r.nameEn),
    }));
  },
});

export interface LocalizedEventDTO {
  readonly id: Id<"events">;
  readonly title: string;
  readonly description: string;
  readonly startingDate: number;
  readonly endingDate: number;
  readonly registrationsOpenDate?: number;
  readonly registrationsCloseDate?: number;
  readonly city?: string;
  readonly region?: string;
  readonly venueName?: string;
  readonly venueAddress?: string;
  readonly googleMapUrl?: string;
  readonly onlineUrl?: string;
  readonly posterUrl?: string;
  readonly isRegistrationRequired: boolean;
  readonly allowWaitlist: boolean;
  readonly capacity?: number;
  readonly externalRegistrationUrl?: string;
}

export const listPublishedEventsLocalized = query({
  args: { locale: AppLocale, limit: v.optional(v.number()) },
  handler: async (ctx, { locale, limit }): Promise<LocalizedEventDTO[]> => {
    const base = ctx.db
      .query("events")
      .withIndex("by_published_start", (q) => q.eq("isPublished", true));
    const rows = await (limit ? base.take(limit) : base.collect());
    return rows.map((e) => ({
      id: e._id,
      title: choose(locale, e.titleAr, e.titleEn),
      description: choose(locale, e.descriptionAr, e.descriptionEn),
      startingDate: e.startingDate,
      endingDate: e.endingDate,
      registrationsOpenDate: e.registrationsOpenDate ?? undefined,
      registrationsCloseDate: e.registrationsCloseDate ?? undefined,
      city: e.city ?? undefined,
      region: e.region ?? undefined,
      venueName: e.venueName ?? undefined,
      venueAddress: e.venueAddress ?? undefined,
      googleMapUrl: e.googleMapUrl ?? undefined,
      onlineUrl: e.onlineUrl ?? undefined,
      posterUrl: e.posterUrl ?? undefined,
      isRegistrationRequired: e.isRegistrationRequired,
      allowWaitlist: e.allowWaitlist,
      capacity: e.capacity ?? undefined,
      externalRegistrationUrl: e.externalRegistrationUrl ?? undefined,
    }));
  },
});

export const getEventLocalized = query({
  args: { locale: AppLocale, eventId: v.id("events") },
  handler: async (
    ctx,
    { locale, eventId },
  ): Promise<LocalizedEventDTO | null> => {
    const e = await ctx.db.get(eventId);
    if (!e) return null;
    return {
      id: e._id,
      title: choose(locale, e.titleAr, e.titleEn),
      description: choose(locale, e.descriptionAr, e.descriptionEn),
      startingDate: e.startingDate,
      endingDate: e.endingDate,
      registrationsOpenDate: e.registrationsOpenDate ?? undefined,
      registrationsCloseDate: e.registrationsCloseDate ?? undefined,
      city: e.city ?? undefined,
      region: e.region ?? undefined,
      venueName: e.venueName ?? undefined,
      venueAddress: e.venueAddress ?? undefined,
      googleMapUrl: e.googleMapUrl ?? undefined,
      onlineUrl: e.onlineUrl ?? undefined,
      posterUrl: e.posterUrl ?? undefined,
      isRegistrationRequired: e.isRegistrationRequired,
      allowWaitlist: e.allowWaitlist,
      capacity: e.capacity ?? undefined,
      externalRegistrationUrl: e.externalRegistrationUrl ?? undefined,
    };
  },
});
