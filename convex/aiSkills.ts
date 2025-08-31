import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { enforceRole } from "./authz";
import { ROLES } from "@/shared/rbac";
import { assertValidSkillLevels } from "./validators";

// In-memory cache for frequently accessed skills
const skillCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedSkill(skillId: string) {
  const cached = skillCache.get(skillId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedSkill(skillId: string, data: any) {
  skillCache.set(skillId, { data, timestamp: Date.now() });
}

/**
 * Admin/Super Admin management for AI Skills (`aiSkills`).
 * - Create and Update with validation and RBAC.
 * - Avoids breaking existing youth flows by isolating to admin-only endpoints.
 */

const LevelV = v.object({
  level: v.number(),
  nameEn: v.string(),
  nameAr: v.string(),
  descriptionEn: v.string(),
  descriptionAr: v.string(),
  questions: v.optional(v.array(v.string())),
  evaluation: v.optional(v.array(v.string())),
  progressionSteps: v.optional(v.array(v.string())),
  resources: v.optional(
    v.array(
      v.object({
        title: v.optional(v.string()),
        url: v.string(),
      }),
    ),
  ),
});

export const createAiSkill = mutation({
  args: {
    skillId: v.optional(v.id("skills")),
    nameEn: v.string(),
    nameAr: v.string(),
    category: v.optional(v.string()),
    definitionEn: v.string(),
    definitionAr: v.string(),
    levels: v.array(LevelV),
  },
  handler: async (ctx, args) => {
    await enforceRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    assertValidSkillLevels(args.levels);

    const now = Date.now();

    // Basic uniqueness check on English name
    const existing = await ctx.db
      .query("aiSkills")
      .withIndex("by_name_en", (q) => q.eq("nameEn", args.nameEn))
      .unique();
    if (existing) throw new Error("aiSkill with same nameEn already exists");

    const _id = (await ctx.db.insert("aiSkills", {
      skillId: args.skillId,
      nameEn: args.nameEn,
      nameAr: args.nameAr,
      category: args.category,
      definitionEn: args.definitionEn,
      definitionAr: args.definitionAr,
      levels: args.levels,
      createdAt: now,
      updatedAt: now,
    })) as Id<"aiSkills">;

    return { _id } as const;
  },
});

// Optimized query for frequently accessed skills with caching
export const getSkillOptimized = query({
  args: { id: v.id("aiSkills") },
  handler: async (ctx, { id }) => {
    // Check cache first
    const cached = getCachedSkill(id);
    if (cached) return cached;

    const skill = await ctx.db.get(id);
    if (skill) {
      setCachedSkill(id, skill);
    }
    return skill;
  },
});

export const updateAiSkill = mutation({
  args: {
    id: v.id("aiSkills"),
    patch: v.object({
      skillId: v.optional(v.id("skills")),
      nameEn: v.optional(v.string()),
      nameAr: v.optional(v.string()),
      category: v.optional(v.string()),
      definitionEn: v.optional(v.string()),
      definitionAr: v.optional(v.string()),
      levels: v.optional(v.array(LevelV)),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await enforceRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);

    const current = await ctx.db.get(id);
    if (!current) throw new Error("aiSkill not found");

    if (patch.levels) assertValidSkillLevels(patch.levels);

    if (patch.nameEn && patch.nameEn !== current.nameEn) {
      const dup = await ctx.db
        .query("aiSkills")
        .withIndex("by_name_en", (q) => q.eq("nameEn", patch.nameEn!))
        .unique();
      if (dup && dup._id !== id)
        throw new Error("Another aiSkill with the same nameEn exists");
    }

    const updated = {
      skillId: patch.skillId ?? current.skillId,
      nameEn: patch.nameEn ?? current.nameEn,
      nameAr: patch.nameAr ?? current.nameAr,
      category: patch.category ?? current.category,
      definitionEn: patch.definitionEn ?? current.definitionEn,
      definitionAr: patch.definitionAr ?? current.definitionAr,
      levels: patch.levels ?? current.levels,
      updatedAt: Date.now(),
    } as const;

    await ctx.db.patch(id, updated as any);

    // Invalidate cache on update
    skillCache.delete(id);

    return { id } as const;
  },
});
