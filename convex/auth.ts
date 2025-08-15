import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP],
  callbacks: {
    async afterUserCreatedOrUpdated(
      ctx: MutationCtx,
      { userId }: { userId: Id<"users"> },
    ): Promise<void> {
      // Load auth user document to read latest email/name/photo
      const authUser = await ctx.db.get(userId);
      const email: string | undefined = authUser?.email ?? undefined;
      const now: number = Date.now();
      // Find existing app user by authUserId
      const existing = await ctx.db
        .query("appUsers")
        .withIndex("by_auth_user", (q) => q.eq("authUserId", userId))
        .unique();
      if (!existing) {
        await ctx.db.insert("appUsers", {
          authUserId: userId,
          email: email ?? "",
          userName: undefined,
          avatarUrl: authUser?.image ?? undefined,
          firstName: undefined,
          lastName: undefined,
          phone: authUser?.phone ?? undefined,
          role: "YOUTH",
          isBlocked: false,
          isDeleted: false,
          languagePreference: "ar",
          createdAt: now,
          updatedAt: now,
        });
        return;
      }
      await ctx.db.patch(existing._id, {
        email: email ?? existing.email,
        avatarUrl: authUser?.image ?? existing.avatarUrl,
        phone: authUser?.phone ?? existing.phone,
        isDeleted: false,
        updatedAt: now,
      });
    },
  },
});
