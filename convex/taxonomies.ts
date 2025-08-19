import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ROLES } from "../src/shared/rbac";
import { requireRole } from "./authz";

// Admin-side raw listing (no localization)
export const listSkills = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const rows = await ctx.db.query("skills").order("asc").collect();
    return rows.map((r) => ({ id: r._id, nameEn: r.nameEn, nameAr: r.nameAr }));
  },
});

export const listInterests = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const rows = await ctx.db.query("interests").order("asc").collect();
    return rows.map((r) => ({ id: r._id, nameEn: r.nameEn, nameAr: r.nameAr }));
  },
});

export const createSkill = mutation({
  args: {
    nameEn: v.string(),
    nameAr: v.string(),
  },
  handler: async (ctx, { nameEn, nameAr }) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_name_en", (q) => q.eq("nameEn", nameEn))
      .unique();
    if (existing) return existing._id; // idempotent
    const now = Date.now();
    const id = await ctx.db.insert("skills", {
      nameEn,
      nameAr,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const updateSkill = mutation({
  args: {
    id: v.id("skills"),
    nameEn: v.optional(v.string()),
    nameAr: v.optional(v.string()),
  },
  handler: async (ctx, { id, nameEn, nameAr }) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const patch: { nameEn?: string; nameAr?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };
    if (typeof nameEn === "string") patch.nameEn = nameEn;
    if (typeof nameAr === "string") patch.nameAr = nameAr;
    await ctx.db.patch(id, patch);
    return { ok: true } as const;
  },
});

export const deleteSkill = mutation({
  args: { id: v.id("skills") },
  handler: async (ctx, { id }) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    await ctx.db.delete(id);
    return { ok: true } as const;
  },
});

export const createInterest = mutation({
  args: {
    nameEn: v.string(),
    nameAr: v.string(),
  },
  handler: async (ctx, { nameEn, nameAr }) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const existing = await ctx.db
      .query("interests")
      .withIndex("by_name_en", (q) => q.eq("nameEn", nameEn))
      .unique();
    if (existing) return existing._id;
    const now = Date.now();
    const id = await ctx.db.insert("interests", {
      nameEn,
      nameAr,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const updateInterest = mutation({
  args: {
    id: v.id("interests"),
    nameEn: v.optional(v.string()),
    nameAr: v.optional(v.string()),
  },
  handler: async (ctx, { id, nameEn, nameAr }) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    const patch: { nameEn?: string; nameAr?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };
    if (typeof nameEn === "string") patch.nameEn = nameEn;
    if (typeof nameAr === "string") patch.nameAr = nameAr;
    await ctx.db.patch(id, patch);
    return { ok: true } as const;
  },
});

export const deleteInterest = mutation({
  args: { id: v.id("interests") },
  handler: async (ctx, { id }) => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    await ctx.db.delete(id);
    return { ok: true } as const;
  },
});
