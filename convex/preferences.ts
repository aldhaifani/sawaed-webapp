import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const setLanguagePreference = mutation({
  args: { locale: v.union(v.literal("ar"), v.literal("en")) },
  handler: async (ctx, { locale }): Promise<boolean> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return false;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser) return false;
    await ctx.db.patch(appUser._id, {
      languagePreference: locale,
      updatedAt: Date.now(),
    });
    return true;
  },
});
