import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { enforceRole } from "./authz";
import { ROLES } from "@/shared/rbac";

export const getMyAdminOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const appUser = await enforceRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const doc = await ctx.db
      .query("adminOnboarding")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return doc ?? null;
  },
});

export const saveAdminDraftDetails = mutation({
  args: {
    organizationNameEn: v.optional(v.string()),
    organizationNameAr: v.optional(v.string()),
    departmentEn: v.optional(v.string()),
    departmentAr: v.optional(v.string()),
    jobTitleEn: v.optional(v.string()),
    jobTitleAr: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appUser = await enforceRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    const existing = await ctx.db
      .query("adminOnboarding")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      const id = await ctx.db.insert("adminOnboarding", {
        userId,
        currentStep: "org",
        completed: false,
        organizationNameEn: args.organizationNameEn,
        organizationNameAr: args.organizationNameAr,
        departmentEn: args.departmentEn,
        departmentAr: args.departmentAr,
        jobTitleEn: args.jobTitleEn,
        jobTitleAr: args.jobTitleAr,
        createdAt: now,
        updatedAt: now,
      });
      return { id } as const;
    }
    const patch: Partial<{
      organizationNameEn: string | undefined;
      organizationNameAr: string | undefined;
      departmentEn: string | undefined;
      departmentAr: string | undefined;
      jobTitleEn: string | undefined;
      jobTitleAr: string | undefined;
      updatedAt: number;
    }> = { updatedAt: now };
    for (const k of [
      "organizationNameEn",
      "organizationNameAr",
      "departmentEn",
      "departmentAr",
      "jobTitleEn",
      "jobTitleAr",
    ] as const) {
      if (k in args) {
        (patch as any)[k] = (args as any)[k];
      }
    }
    await ctx.db.patch(existing._id, patch);
    return { id: existing._id } as const;
  },
});

export const completeAdminOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const appUser = await enforceRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    const existing = await ctx.db
      .query("adminOnboarding")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      const id = await ctx.db.insert("adminOnboarding", {
        userId,
        currentStep: "done",
        completed: true,
        createdAt: now,
        updatedAt: now,
      });
      return { id, completed: true } as const;
    }
    await ctx.db.patch(existing._id, {
      currentStep: "done",
      completed: true,
      updatedAt: now,
    });
    return { id: existing._id, completed: true } as const;
  },
});
