import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./authz";

export const getMyNotificationPreferences = query({
  args: {},
  handler: async (ctx) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      return {
        productUpdates: true,
        securityAlerts: true,
        marketing: false,
      } as const;
    }
    return {
      productUpdates: existing.productUpdates,
      securityAlerts: existing.securityAlerts,
      marketing: existing.marketing,
    } as const;
  },
});

export const setMyNotificationPreferences = mutation({
  args: {
    productUpdates: v.boolean(),
    securityAlerts: v.boolean(),
    marketing: v.boolean(),
  },
  handler: async (ctx, args) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      await ctx.db.insert("notificationPreferences", {
        userId,
        productUpdates: args.productUpdates,
        securityAlerts: args.securityAlerts,
        marketing: args.marketing,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true } as const;
    }
    await ctx.db.patch(existing._id, {
      productUpdates: args.productUpdates,
      securityAlerts: args.securityAlerts,
      marketing: args.marketing,
      updatedAt: now,
    });
    return { ok: true } as const;
  },
});
