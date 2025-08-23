import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { ROLES } from "@/shared/rbac";
import { requireRole } from "./authz";
import type { Value } from "convex/values";

// Types
export type RegistrationPolicy = "open" | "approval" | "inviteOnly";

export const createEventDraft = mutation({
  args: {
    titleEn: v.string(),
    titleAr: v.string(),
    descriptionEn: v.string(),
    descriptionAr: v.string(),
    startingDate: v.number(),
    endingDate: v.number(),
    registrationsOpenDate: v.optional(v.number()),
    registrationsCloseDate: v.optional(v.number()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    googleMapUrl: v.optional(v.string()),
    onlineUrl: v.optional(v.string()),
    posterUrl: v.optional(v.string()),
    registrationPolicy: v.optional(
      v.union(
        v.literal("open"),
        v.literal("approval"),
        v.literal("inviteOnly"),
      ),
    ),
    isRegistrationRequired: v.optional(v.boolean()),
    allowWaitlist: v.optional(v.boolean()),
    capacity: v.optional(v.number()),
    externalRegistrationUrl: v.optional(v.string()),
    maxRegistrationsPerUser: v.optional(v.number()),
    termsUrl: v.optional(v.string()),
    contact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      titleEn: args.titleEn,
      titleAr: args.titleAr,
      descriptionEn: args.descriptionEn,
      descriptionAr: args.descriptionAr,
      startingDate: args.startingDate,
      endingDate: args.endingDate,
      registrationsOpenDate: args.registrationsOpenDate,
      registrationsCloseDate: args.registrationsCloseDate,
      city: args.city,
      region: args.region,
      venueName: args.venueName,
      venueAddress: args.venueAddress,
      googleMapUrl: args.googleMapUrl,
      onlineUrl: args.onlineUrl,
      posterUrl: args.posterUrl,
      isPublished: false,
      registrationPolicy: (args.registrationPolicy ??
        "open") as RegistrationPolicy,
      isRegistrationRequired: args.isRegistrationRequired ?? false,
      allowWaitlist: args.allowWaitlist ?? false,
      capacity: args.capacity,
      externalRegistrationUrl: args.externalRegistrationUrl,
      maxRegistrationsPerUser: args.maxRegistrationsPerUser,
      termsUrl: args.termsUrl,
      contact: args.contact,
      createdByAdminId: user._id as Id<"appUsers">,
      createdAt: now,
      updatedAt: now,
    });
    return { id: eventId };
  },
});

export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    // All fields optional for patching
    titleEn: v.optional(v.string()),
    titleAr: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    descriptionAr: v.optional(v.string()),
    startingDate: v.optional(v.number()),
    endingDate: v.optional(v.number()),
    registrationsOpenDate: v.optional(v.number()),
    registrationsCloseDate: v.optional(v.number()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    googleMapUrl: v.optional(v.string()),
    onlineUrl: v.optional(v.string()),
    posterUrl: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    registrationPolicy: v.optional(
      v.union(
        v.literal("open"),
        v.literal("approval"),
        v.literal("inviteOnly"),
      ),
    ),
    isRegistrationRequired: v.optional(v.boolean()),
    allowWaitlist: v.optional(v.boolean()),
    capacity: v.optional(v.number()),
    externalRegistrationUrl: v.optional(v.string()),
    maxRegistrationsPerUser: v.optional(v.number()),
    termsUrl: v.optional(v.string()),
    contact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, vVal] of Object.entries(rest)) {
      if (typeof vVal !== "undefined") patch[k] = vVal;
    }
    patch.updatedAt = Date.now();
    await ctx.db.patch(id, patch);
    return { id };
  },
});

export const publishEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    await ctx.db.patch(id, { isPublished: true, updatedAt: Date.now() });
    return { id };
  },
});

export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    await ctx.db.delete(id);
    return { id };
  },
});

export const getEventById = query({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    const user = await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const ev = await ctx.db.get(id);
    if (!ev) return null;
    // Only allow viewing if creator or super admin; admins can see all for now
    return ev;
  },
});

export const listMyEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const events = await ctx.db
      .query("events")
      .withIndex("by_creator", (q) => q.eq("createdByAdminId", user._id))
      .collect();
    return events;
  },
});

/**
 * Paginated admin listing of events with optional search and status filters.
 * - Admins and Super Admins can see all events.
 * - Results ordered by `startingDate` descending.
 * - Status filter maps to `isPublished` (Draft=false, Published=true).
 * - Returns `canEdit` per row when `createdByAdminId` matches current user.
 */
export const listAdminEventsPaginated = query({
  args: {
    searchText: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("All"), v.literal("Published"), v.literal("Draft")),
    ),
    paginationOpts: paginationOptsValidator,
    locale: v.union(v.literal("ar"), v.literal("en")),
    regionId: v.optional(v.id("regions")),
    cityId: v.optional(v.id("cities")),
    // Advanced filters
    startingDateFrom: v.optional(v.number()),
    startingDateTo: v.optional(v.number()),
    registrationPolicy: v.optional(
      v.union(
        v.literal("open"),
        v.literal("approval"),
        v.literal("inviteOnly"),
      ),
    ),
    isRegistrationRequired: v.optional(v.boolean()),
    allowWaitlist: v.optional(v.boolean()),
    capacityMin: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const {
      status = "All",
      paginationOpts,
      locale,
      regionId,
      cityId,
      startingDateFrom,
      startingDateTo,
      registrationPolicy,
      isRegistrationRequired,
      allowWaitlist,
      capacityMin,
    } = args;
    let page;
    if (status === "Published") {
      page = await ctx.db
        .query("events")
        .withIndex("by_published_start", (idx) => idx.eq("isPublished", true))
        .order("desc")
        .paginate(paginationOpts);
    } else if (status === "Draft") {
      page = await ctx.db
        .query("events")
        .withIndex("by_published_start", (idx) => idx.eq("isPublished", false))
        .order("desc")
        .paginate(paginationOpts);
    } else {
      page = await ctx.db
        .query("events")
        .withIndex("by_starting_date")
        .order("desc")
        .paginate(paginationOpts);
    }
    // Helper to choose localized text
    const choose = (
      loc: "ar" | "en",
      ar?: string | null,
      en?: string | null,
    ): string | undefined => {
      const a = (ar ?? "").trim();
      const e = (en ?? "").trim();
      const val = loc === "ar" ? a || e : e || a;
      return val || undefined;
    };

    // Load all regions once (small dataset)
    const allRegions = await ctx.db.query("regions").collect();
    // Resolve filter target bilingual names
    let filterRegionNames: { ar?: string; en?: string } | null = null;
    let filterCityNames: { ar?: string; en?: string } | null = null;
    if (regionId) {
      const r = await ctx.db.get(regionId);
      if (r)
        filterRegionNames = {
          ar: (r as any).nameAr as string | undefined,
          en: (r as any).nameEn as string | undefined,
        };
    }
    if (cityId) {
      const c = await ctx.db.get(cityId);
      if (c)
        filterCityNames = {
          ar: (c as any).nameAr as string | undefined,
          en: (c as any).nameEn as string | undefined,
        };
    }

    // Optionally filter by resolved bilingual names and advanced filters
    const filtered = page.page.filter((ev) => {
      // Enforce draft visibility: only creator can see drafts
      if (!ev.isPublished && ev.createdByAdminId !== user._id) return false;

      const regionOk = !filterRegionNames
        ? true
        : ev.region === filterRegionNames.ar ||
          ev.region === filterRegionNames.en;
      const cityOk = !filterCityNames
        ? true
        : ev.city === filterCityNames.ar || ev.city === filterCityNames.en;
      if (!regionOk || !cityOk) return false;

      if (
        typeof startingDateFrom === "number" &&
        ev.startingDate < startingDateFrom
      )
        return false;
      if (
        typeof startingDateTo === "number" &&
        ev.startingDate > startingDateTo
      )
        return false;
      if (registrationPolicy && ev.registrationPolicy !== registrationPolicy)
        return false;
      if (
        typeof isRegistrationRequired === "boolean" &&
        ev.isRegistrationRequired !== isRegistrationRequired
      )
        return false;
      if (
        typeof allowWaitlist === "boolean" &&
        ev.allowWaitlist !== allowWaitlist
      )
        return false;
      if (typeof capacityMin === "number" && (ev.capacity ?? 0) < capacityMin)
        return false;

      return true;
    });

    const localizedPage = await Promise.all(
      filtered.map(async (ev) => {
        let regionName: string | undefined = ev.region ?? undefined;
        let cityName: string | undefined = ev.city ?? undefined;

        // Try to localize region
        if (ev.region) {
          const regionDoc = allRegions.find(
            (r) =>
              (r as Value & { nameAr?: string; nameEn?: string }).nameAr ===
                ev.region ||
              (r as Value & { nameAr?: string; nameEn?: string }).nameEn ===
                ev.region,
          );
          if (regionDoc) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const nameAr = (regionDoc as any).nameAr as string | undefined;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const nameEn = (regionDoc as any).nameEn as string | undefined;
            regionName = choose(locale, nameAr ?? null, nameEn ?? null);
          }
        }

        // Try to localize city (if we could resolve region)
        if (ev.city) {
          let citiesInRegion: Array<
            Value & { _id: Id<"cities">; nameAr?: string; nameEn?: string }
          > | null = null;
          const regionDoc = allRegions.find(
            (r) =>
              (r as any).nameAr === ev.region ||
              (r as any).nameEn === ev.region,
          );
          if (regionDoc) {
            citiesInRegion = await ctx.db
              .query("cities")
              .withIndex("by_region", (q) =>
                q.eq("regionId", (regionDoc as any)._id as Id<"regions">),
              )
              .collect();
          }
          const candidateCities = citiesInRegion ?? [];
          const cityDoc = candidateCities.find(
            (c) =>
              (c as any).nameAr === ev.city || (c as any).nameEn === ev.city,
          );
          if (cityDoc) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const nameAr = (cityDoc as any).nameAr as string | undefined;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const nameEn = (cityDoc as any).nameEn as string | undefined;
            cityName = choose(locale, nameAr ?? null, nameEn ?? null);
          }
        }

        return {
          _id: ev._id,
          titleEn: ev.titleEn,
          titleAr: ev.titleAr,
          descriptionEn: ev.descriptionEn,
          descriptionAr: ev.descriptionAr,
          startingDate: ev.startingDate,
          endingDate: ev.endingDate,
          city: cityName,
          region: regionName,
          isPublished: ev.isPublished,
          createdByAdminId: ev.createdByAdminId,
          canEdit: ev.createdByAdminId === user._id,
        } as const;
      }),
    );

    return {
      ...page,
      page: localizedPage,
    };
  },
});
