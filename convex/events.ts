import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { ROLES } from "@/shared/rbac";
import { requireRole } from "./authz";

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
