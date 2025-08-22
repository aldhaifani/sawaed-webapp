import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";

export const getStatus = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ completed: boolean; currentStep?: string } | null> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;
    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();
    if (!existing) return { completed: false, currentStep: "welcome" };
    return {
      completed: existing.completed,
      currentStep: existing.currentStep ?? undefined,
    };
  },
});

export const getDraft = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    firstNameAr?: string;
    lastNameAr?: string;
    firstNameEn?: string;
    lastNameEn?: string;
    gender?: "male" | "female";
    city?: string;
    region?: string;
    draftSkillIds?: Id<"skills">[];
    draftInterestIds?: Id<"interests">[];
  } | null> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;
    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();
    if (!existing) return null;
    return {
      firstNameAr: existing.firstNameAr,
      lastNameAr: existing.lastNameAr,
      firstNameEn: existing.firstNameEn,
      lastNameEn: existing.lastNameEn,
      gender: existing.gender as "male" | "female" | undefined,
      city: existing.city,
      region: existing.region,
      draftSkillIds: existing.draftSkillIds as Id<"skills">[] | undefined,
      draftInterestIds: existing.draftInterestIds as
        | Id<"interests">[]
        | undefined,
    };
  },
});

export const setStep = mutation({
  args: { step: v.string() },
  handler: async (ctx, { step }): Promise<boolean> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return false;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return false;
    const now = Date.now();
    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("userOnboarding", {
        userId: appUser._id as Id<"appUsers">,
        currentStep: step,
        completed: false,
        createdAt: now,
        updatedAt: now,
      });
      return true;
    }
    await ctx.db.patch(existing._id, { currentStep: step, updatedAt: now });
    return true;
  },
});

export const saveDraftDetails = mutation({
  args: {
    firstNameAr: v.string(),
    lastNameAr: v.string(),
    firstNameEn: v.string(),
    lastNameEn: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    city: v.string(),
    region: v.string(),
  },
  handler: async (
    ctx,
    { firstNameAr, lastNameAr, firstNameEn, lastNameEn, gender, city, region },
  ): Promise<boolean> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return false;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return false;
    const now = Date.now();
    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("userOnboarding", {
        userId: appUser._id as Id<"appUsers">,
        currentStep: "details",
        completed: false,
        firstNameAr,
        lastNameAr,
        firstNameEn,
        lastNameEn,
        gender,
        city,
        region,
        createdAt: now,
        updatedAt: now,
      });
      return true;
    }
    await ctx.db.patch(existing._id, {
      firstNameAr,
      lastNameAr,
      firstNameEn,
      lastNameEn,
      gender,
      city,
      region,
      updatedAt: now,
    });
    return true;
  },
});

export const saveDraftTaxonomies = mutation({
  args: {
    skillIds: v.array(v.id("skills")),
    interestIds: v.array(v.id("interests")),
  },
  handler: async (ctx, { skillIds, interestIds }): Promise<boolean> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return false;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return false;
    const now = Date.now();
    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("userOnboarding", {
        userId: appUser._id as Id<"appUsers">,
        currentStep: "taxonomies",
        completed: false,
        draftSkillIds: skillIds,
        draftInterestIds: interestIds,
        createdAt: now,
        updatedAt: now,
      });
      return true;
    }
    await ctx.db.patch(existing._id, {
      draftSkillIds: skillIds,
      draftInterestIds: interestIds,
      updatedAt: now,
    });
    return true;
  },
});

export const complete = mutation({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return false;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return false;
    const now = Date.now();
    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("userOnboarding", {
        userId: appUser._id as Id<"appUsers">,
        currentStep: "done",
        completed: true,
        createdAt: now,
        updatedAt: now,
      });
      return true;
    }
    await ctx.db.patch(existing._id, {
      completed: true,
      currentStep: "done",
      updatedAt: now,
    });
    return true;
  },
});

export const upsertBasicDetails = mutation({
  args: {
    firstNameAr: v.string(),
    lastNameAr: v.string(),
    firstNameEn: v.string(),
    lastNameEn: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    city: v.string(),
    region: v.string(),
    locale: v.union(v.literal("ar"), v.literal("en")),
  },
  handler: async (
    ctx,
    {
      firstNameAr,
      lastNameAr,
      firstNameEn,
      lastNameEn,
      gender,
      city,
      region,
      locale,
    },
  ): Promise<boolean> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return false;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return false;
    const now = Date.now();
    // Persist bilingual names and gender on appUsers
    await ctx.db.patch(appUser._id, {
      firstNameAr,
      lastNameAr,
      firstNameEn,
      lastNameEn,
      gender,
      updatedAt: now,
    });
    // Ensure a profile row exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .unique();
    if (!existingProfile) {
      await ctx.db.insert("profiles", {
        userId: appUser._id as Id<"appUsers">,
        city,
        region,
        createdAt: now,
        updatedAt: now,
        headline: undefined,
        bio: undefined,
        pictureUrl: undefined,
        completionPercentage: 0,
        collaborationStatus: undefined,
      });
    } else {
      await ctx.db.patch(existingProfile._id, { city, region, updatedAt: now });
    }
    return true;
  },
});

export const setUserTaxonomies = mutation({
  args: {
    skillIds: v.array(v.id("skills")),
    interestIds: v.array(v.id("interests")),
  },
  handler: async (
    ctx,
    { skillIds, interestIds },
  ): Promise<{ skills: number; interests: number }> => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return { skills: 0, interests: 0 };
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH")
      return { skills: 0, interests: 0 };
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    // Insert skills if missing
    let addedSkills = 0;
    for (const sid of skillIds) {
      const exists = await ctx.db
        .query("userSkills")
        .withIndex("by_user_skill", (q) =>
          q.eq("userId", userId).eq("skillId", sid),
        )
        .unique();
      if (!exists) {
        await ctx.db.insert("userSkills", {
          userId,
          skillId: sid,
          createdAt: now,
        });
        addedSkills += 1;
      }
    }
    // Insert interests if missing
    let addedInterests = 0;
    for (const iid of interestIds) {
      const exists = await ctx.db
        .query("userInterests")
        .withIndex("by_user_interest", (q) =>
          q.eq("userId", userId).eq("interestId", iid),
        )
        .unique();
      if (!exists) {
        await ctx.db.insert("userInterests", {
          userId,
          interestId: iid,
          createdAt: now,
        });
        addedInterests += 1;
      }
    }
    return { skills: addedSkills, interests: addedInterests };
  },
});
