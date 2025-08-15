import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Soft-delete any appUsers whose linked Convex Auth user document no longer exists.
 */
export const reconcileOrphanedAppUsers = internalMutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const appUsers = await ctx.db.query("appUsers").collect();
    let updated = 0;
    for (const appUser of appUsers) {
      const authUser = await ctx.db.get(appUser.authUserId as Id<"users">);
      if (!authUser && !appUser.isDeleted) {
        await ctx.db.patch(appUser._id, {
          isDeleted: true,
          updatedAt: Date.now(),
        });
        updated += 1;
      }
    }
    return updated;
  },
});

/**
 * Mark a specific appUser as soft-deleted if its linked Convex Auth user is missing.
 */
export const markDeletedIfAuthMissing = internalMutation({
  args: { authUserId: v.id("users") },
  handler: async (ctx, { authUserId }): Promise<boolean> => {
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser) return false;
    const authUser = await ctx.db.get(authUserId);
    if (authUser) return false;
    await ctx.db.patch(appUser._id, { isDeleted: true, updatedAt: Date.now() });
    return true;
  },
});
