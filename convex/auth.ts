import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./ResendOTP";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";
import { ROLES } from "@/shared/rbac";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { z } from "zod";
// Analytics sending is decoupled from mutations to avoid Node runtime imports

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // Enable Password-based auth with email verification via ResendOTP.
  // Keep ResendOTP active to maintain the existing OTP-only UI until the new
  // email+password UI is shipped (Phase 2). This ensures backward compatibility.
  providers: [
    Password({
      verify: ResendOTP,
      reset: ResendOTPPasswordReset,
      // Ensure consistent email mapping and validation for account linking
      profile(params) {
        const EmailSchema = z
          .object({ email: z.string().email() })
          .transform((v) => ({ email: v.email.trim().toLowerCase() }));
        const parsed = EmailSchema.safeParse(params);
        if (!parsed.success) {
          throw new Error("Invalid email");
        }
        return { email: parsed.data.email };
      },
    }),
    ResendOTP,
  ],
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
          firstNameAr: undefined,
          lastNameAr: undefined,
          firstNameEn: undefined,
          lastNameEn: undefined,
          gender: undefined,
          phone: authUser?.phone ?? undefined,
          role: ROLES.YOUTH,
          isBlocked: false,
          isDeleted: false,
          languagePreference: "ar",
          createdAt: now,
          updatedAt: now,
        });
        // Analytics omitted in mutation to keep Convex runtime compatible
        return;
      }
      await ctx.db.patch(existing._id, {
        email: email ?? existing.email,
        avatarUrl: authUser?.image ?? existing.avatarUrl,
        phone: authUser?.phone ?? existing.phone,
        isDeleted: false,
        updatedAt: now,
      });
      // Analytics omitted in mutation to keep Convex runtime compatible
    },
  },
});
