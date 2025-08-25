import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { enforceRole } from "./authz";
import { ROLES } from "@/shared/rbac";

export const getMySuperAdminProfile = query({
  args: {},
  handler: async (ctx) => {
    const appUser = await enforceRole(ctx, [ROLES.SUPER_ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const profile = await ctx.db
      .query("superAdminProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return profile ?? null;
  },
});

// Helper query for actions to enforce SUPER_ADMIN using action-compatible ctx.runQuery
export const requireSuperAdmin = query({
  args: {},
  handler: async (ctx) => {
    // Reuse existing role enforcement on a query/mutation ctx
    return enforceRole(ctx, [ROLES.SUPER_ADMIN]);
  },
});

export const upsertMySuperAdminProfile = mutation({
  args: {
    email: v.string(),
    department: v.optional(v.string()),
    employeeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appUser = await enforceRole(ctx, [ROLES.SUPER_ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    const existing = await ctx.db
      .query("superAdminProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      const id = await ctx.db.insert("superAdminProfiles", {
        userId,
        email: args.email,
        department: args.department,
        employeeId: args.employeeId,
        createdAt: now,
        updatedAt: now,
      });
      return { id } as const;
    }
    await ctx.db.patch(existing._id, {
      email: args.email,
      department: args.department,
      employeeId: args.employeeId,
      updatedAt: now,
    });
    return { id: existing._id } as const;
  },
});

export const generateSuperAdminAvatarUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    // Action ctx doesn't expose db; enforce role via a query
    await ctx.runQuery(api.superAdminProfiles.requireSuperAdmin, {});
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl } as const;
  },
});

export const finalizeSuperAdminAvatarUpload = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    const appUser = await enforceRole(ctx, [ROLES.SUPER_ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const pictureUrl = await ctx.storage.getUrl(storageId);
    const now = Date.now();
    const existing = await ctx.db
      .query("superAdminProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      const id = await ctx.db.insert("superAdminProfiles", {
        userId,
        email: appUser.email,
        pictureUrl: pictureUrl ?? undefined,
        pictureStorageId: storageId,
        createdAt: now,
        updatedAt: now,
      });
      return { id } as const;
    }
    await ctx.db.patch(existing._id, {
      pictureUrl: pictureUrl ?? undefined,
      pictureStorageId: storageId,
      updatedAt: now,
    });
    return { id: existing._id } as const;
  },
});

export const clearSuperAdminAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const appUser = await enforceRole(ctx, [ROLES.SUPER_ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const existing = await ctx.db
      .query("superAdminProfiles")
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
