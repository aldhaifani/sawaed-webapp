import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";
import type { Role } from "@/shared/rbac";

export interface CurrentUserResponse {
  readonly userId: Id<"appUsers">;
  readonly authUserId: Id<"users">;
  readonly email: string;
  readonly role: Role;
  readonly isBlocked: boolean;
  readonly isDeleted: boolean;
  readonly languagePreference: "ar" | "en";
  readonly avatarUrl?: string;
  readonly pictureUrl?: string;
}

/**
 * Return the current application user's identity and role, if authenticated.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx): Promise<CurrentUserResponse | null> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", appUser._id))
      .unique();
    return {
      userId: appUser._id as Id<"appUsers">,
      authUserId,
      email: appUser.email,
      role: appUser.role as Role,
      isBlocked: appUser.isBlocked,
      isDeleted: appUser.isDeleted,
      languagePreference: appUser.languagePreference,
      avatarUrl: appUser.avatarUrl ?? undefined,
      pictureUrl: profile?.pictureUrl ?? undefined,
    };
  },
});
