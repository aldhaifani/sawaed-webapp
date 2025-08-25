import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { enforceRole } from "./authz";
import { ROLES } from "@/shared/rbac";

export const getMyAdminProfile = query({
  args: {},
  handler: async (ctx) => {
    const appUser = await enforceRole(ctx, [ROLES.ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const profile = await ctx.db
      .query("adminProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return profile ?? null;
  },
});

export const upsertMyAdminProfile = mutation({
  args: {
    organizationNameEn: v.optional(v.string()),
    organizationNameAr: v.optional(v.string()),
    departmentEn: v.optional(v.string()),
    departmentAr: v.optional(v.string()),
    jobTitleEn: v.optional(v.string()),
    jobTitleAr: v.optional(v.string()),
    employeeId: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appUser = await enforceRole(ctx, [ROLES.ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    const existing = await ctx.db
      .query("adminProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      const id = await ctx.db.insert("adminProfiles", {
        userId,
        ...args,
        createdAt: now,
        updatedAt: now,
      });
      return { id } as const;
    }
    const patch: Record<string, unknown> = { updatedAt: now };
    for (const k of [
      "organizationNameEn",
      "organizationNameAr",
      "departmentEn",
      "departmentAr",
      "jobTitleEn",
      "jobTitleAr",
      "employeeId",
      "contactEmail",
      "contactPhone",
    ] as const) {
      if (k in args && typeof (args as any)[k] !== "undefined") {
        patch[k] = (args as any)[k];
      }
    }
    await ctx.db.patch(existing._id, patch);
    return { id: existing._id } as const;
  },
});

export const getMyAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const appUser = await enforceRole(ctx, [ROLES.ADMIN]);
    const userId = appUser._id as Id<"appUsers">;

    const myEvents = await ctx.db
      .query("events")
      .withIndex("by_creator", (q) => q.eq("createdByAdminId", userId))
      .collect();

    const totalEvents = myEvents.length;
    const publishedEvents = myEvents.filter((e) => e.isPublished).length;
    const draftedEvents = myEvents.filter((e) => !e.isPublished).length;

    return { totalEvents, publishedEvents, draftedEvents } as const;
  },
});

// ---------- Admin data backfill ----------
export const backfillAdminProfiles = mutation({
  args: {},
  handler: async (ctx) => {
    // Restrict to SUPER_ADMIN to avoid accidental mass writes
    await enforceRole(ctx, [ROLES.SUPER_ADMIN]);
    const admins = await ctx.db
      .query("appUsers")
      .withIndex("by_role", (q) => q.eq("role", ROLES.ADMIN))
      .collect();
    let created = 0;
    const now = Date.now();
    for (const admin of admins) {
      const existing = await ctx.db
        .query("adminProfiles")
        .withIndex("by_user", (q) =>
          q.eq("userId", admin._id as Id<"appUsers">),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("adminProfiles", {
          userId: admin._id as Id<"appUsers">,
          createdAt: now,
          updatedAt: now,
        });
        created += 1;
      }
    }
    return { created } as const;
  },
});

// ---------- Storage helpers for admin avatar ----------
export const generateAdminAvatarUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    // Only require auth on finalize; generating a URL can be anonymous in Convex
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl } as const;
  },
});

export const finalizeAdminAvatarUpload = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    const appUser = await enforceRole(ctx, [ROLES.ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const pictureUrl = await ctx.storage.getUrl(storageId);
    const now = Date.now();

    const existing = await ctx.db
      .query("adminProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      const id = await ctx.db.insert("adminProfiles", {
        userId,
        pictureUrl: pictureUrl ?? undefined,
        pictureStorageId: storageId,
        createdAt: now,
        updatedAt: now,
      });
      return { id } as const;
    }
    // If previously had a storage image, delete it
    const prevSid = (
      existing as unknown as { pictureStorageId?: Id<"_storage"> }
    ).pictureStorageId;
    if (prevSid) await ctx.storage.delete(prevSid);

    await ctx.db.patch(existing._id, {
      pictureUrl: pictureUrl ?? undefined,
      pictureStorageId: storageId,
      updatedAt: now,
    });
    return { id: existing._id } as const;
  },
});

export const clearAdminAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const appUser = await enforceRole(ctx, [ROLES.ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const existing = await ctx.db
      .query("adminProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) return { cleared: false } as const;
    const prevSid = (
      existing as unknown as { pictureStorageId?: Id<"_storage"> }
    ).pictureStorageId;
    if (prevSid) {
      await ctx.storage.delete(prevSid);
    }
    await ctx.db.patch(existing._id, {
      pictureUrl: undefined,
      pictureStorageId: undefined,
      updatedAt: Date.now(),
    });
    return { cleared: true } as const;
  },
});
