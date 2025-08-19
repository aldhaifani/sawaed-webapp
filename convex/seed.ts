import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authz";
import { ROLES } from "@/shared/rbac";

export const upsertSkills = mutation({
  args: {
    items: v.array(
      v.object({
        nameEn: v.string(),
        nameAr: v.string(),
        // category and slug are not stored in current schema; kept for future use
        category: v.optional(v.string()),
        slug: v.optional(v.string()),
      }),
    ),
  },
  handler: async (
    ctx,
    { items },
  ): Promise<{ inserted: number; updated: number }> => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    let inserted = 0;
    let updated = 0;
    for (const item of items) {
      const existing = await ctx.db
        .query("skills")
        .withIndex("by_name_en", (q) => q.eq("nameEn", item.nameEn))
        .unique();
      const now = Date.now();
      if (!existing) {
        await ctx.db.insert("skills", {
          nameEn: item.nameEn,
          nameAr: item.nameAr,
          category: item.category ?? undefined,
          createdAt: now,
          updatedAt: now,
        });
        inserted += 1;
      } else {
        await ctx.db.patch(existing._id, {
          nameAr: item.nameAr,
          category: item.category ?? undefined,
          updatedAt: now,
        });
        updated += 1;
      }
    }
    return { inserted, updated };
  },
});

export const upsertInterests = mutation({
  args: {
    items: v.array(
      v.object({
        nameEn: v.string(),
        nameAr: v.string(),
        category: v.optional(v.string()),
        slug: v.optional(v.string()),
      }),
    ),
  },
  handler: async (
    ctx,
    { items },
  ): Promise<{ inserted: number; updated: number }> => {
    await requireRole(ctx, [ROLES.SUPER_ADMIN]);
    let inserted = 0;
    let updated = 0;
    for (const item of items) {
      const existing = await ctx.db
        .query("interests")
        .withIndex("by_name_en", (q) => q.eq("nameEn", item.nameEn))
        .unique();
      const now = Date.now();
      if (!existing) {
        await ctx.db.insert("interests", {
          nameEn: item.nameEn,
          nameAr: item.nameAr,
          category: item.category ?? undefined,
          createdAt: now,
          updatedAt: now,
        });
        inserted += 1;
      } else {
        await ctx.db.patch(existing._id, {
          nameAr: item.nameAr,
          category: item.category ?? undefined,
          updatedAt: now,
        });
        updated += 1;
      }
    }
    return { inserted, updated };
  },
});
