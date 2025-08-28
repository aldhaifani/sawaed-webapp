import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import { AssessmentResultV, assertValidAssessmentResult } from "./validators";

/**
 * AI Assessment and Learning Path lifecycle functions.
 *
 * Implements Option B: when storing a new assessment, any existing active
 * learning path for the same user+skill is archived before creating a new one.
 */

// ---------- Types ----------

// Types and validators centralized in `./validators`.

// ---------- Validators ----------

// ---------- Queries ----------

/**
 * List available AI skills for the authenticated user (no special role needed).
 * Minimal payload for UI skill picker.
 */
export const getSkills = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return [];
    const skills = await ctx.db.query("aiSkills").collect();
    const enriched = await Promise.all(
      skills.map(async (s) => {
        const relSkillIds = s.relatedSkillIds ?? [];
        const relInterestIds = s.relatedInterestIds ?? [];
        const relatedSkills = (
          await Promise.all(relSkillIds.map((id) => ctx.db.get(id)))
        )
          .filter(Boolean)
          .map((sk) => ({
            _id: sk!._id,
            nameEn: sk!.nameEn as string,
            nameAr: sk!.nameAr as string,
          }));
        const relatedInterests = (
          await Promise.all(relInterestIds.map((id) => ctx.db.get(id)))
        )
          .filter(Boolean)
          .map((it) => ({
            _id: it!._id,
            nameEn: it!.nameEn as string,
            nameAr: it!.nameAr as string,
          }));
        return {
          _id: s._id as Id<"aiSkills">,
          nameEn: s.nameEn as string,
          nameAr: s.nameAr as string,
          category: s.category,
          // Added bilingual definitions for richer UI previews (non-breaking addition)
          definitionEn: s.definitionEn as string,
          definitionAr: s.definitionAr as string,
          levels: s.levels.map((lvl) => ({
            level: lvl.level,
            nameEn: lvl.nameEn,
            nameAr: lvl.nameAr,
          })),
          relatedSkills,
          relatedInterests,
        } as const;
      }),
    );
    return enriched;
  },
});

/**
 * Initialize an assessment session for a given AI skill.
 * Returns the skill metadata and, if present, the latest assessment and
 * current active learning path for context.
 */
export const startAssessment = mutation({
  args: { aiSkillId: v.id("aiSkills") },
  handler: async (ctx, { aiSkillId }) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;

    const skill = await ctx.db.get(aiSkillId);
    if (!skill) throw new Error("Skill not found");

    const assessments = await ctx.db
      .query("aiAssessments")
      .withIndex("by_user_skill", (q) =>
        q
          .eq("userId", appUser._id as Id<"appUsers">)
          .eq("aiSkillId", aiSkillId),
      )
      .collect();
    const latestAssessment = assessments.sort(
      (a, b) => b.createdAt - a.createdAt,
    )[0];

    const paths = await ctx.db
      .query("aiLearningPaths")
      .withIndex("by_user_skill", (q) =>
        q
          .eq("userId", appUser._id as Id<"appUsers">)
          .eq("aiSkillId", aiSkillId),
      )
      .collect();
    const activeLearningPath = paths
      .filter((p) => p.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    return {
      aiSkill: {
        _id: skill._id as Id<"aiSkills">,
        nameEn: skill.nameEn as string,
        nameAr: skill.nameAr as string,
        category: skill.category,
        definitionEn: skill.definitionEn as string,
        definitionAr: skill.definitionAr as string,
        levels: skill.levels,
      },
      latestAssessment: latestAssessment
        ? {
            _id: latestAssessment._id as Id<"aiAssessments">,
            level: latestAssessment.level,
            confidence: latestAssessment.confidence,
            createdAt: latestAssessment.createdAt,
          }
        : undefined,
      activeLearningPath: activeLearningPath
        ? {
            _id: activeLearningPath._id as Id<"aiLearningPaths">,
            status: activeLearningPath.status,
            modules: activeLearningPath.modules,
            createdAt: activeLearningPath.createdAt,
          }
        : undefined,
    } as const;
  },
});

/**
 * Fetch the latest active learning path for the authenticated user and skill.
 */
export const getLearningPath = query({
  args: { aiSkillId: v.id("aiSkills") },
  handler: async (ctx, { aiSkillId }) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return undefined;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return undefined;

    const paths = await ctx.db
      .query("aiLearningPaths")
      .withIndex("by_user_skill", (q) =>
        q
          .eq("userId", appUser._id as Id<"appUsers">)
          .eq("aiSkillId", aiSkillId),
      )
      .collect();

    const latestActive = paths
      .filter((p) => p.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    return latestActive
      ? {
          _id: latestActive._id as Id<"aiLearningPaths">,
          modules: latestActive.modules,
          status: latestActive.status,
          completedModuleIds: latestActive.completedModuleIds ?? [],
          createdAt: latestActive.createdAt,
          updatedAt: latestActive.updatedAt,
        }
      : undefined;
  },
});

// ---------- Mutations ----------

/**
 * Validate and persist an AI assessment result, and create a new active
 * learning path. Any existing active learning paths for the same user+skill
 * are archived first.
 */
export const storeAssessment = mutation({
  args: {
    aiSkillId: v.id("aiSkills"),
    result: AssessmentResultV,
  },
  handler: async (ctx, { aiSkillId, result }) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;

    const now = Date.now();
    const skill = await ctx.db.get(aiSkillId);
    if (!skill) throw new Error("Skill not found");
    const allowedLevels = new Set<number>(skill.levels.map((l) => l.level));
    // Centralized validation: level in skill, confidence 0..1, modules count and fields, reasoning length.
    assertValidAssessmentResult(result as any, allowedLevels);

    const assessmentId = (await ctx.db.insert("aiAssessments", {
      userId: appUser._id as Id<"appUsers">,
      aiSkillId,
      level: result.level,
      confidence: result.confidence,
      reasoning: result.reasoning,
      rawJson: JSON.stringify(result),
      createdAt: now,
    })) as Id<"aiAssessments">;

    const existingPaths = await ctx.db
      .query("aiLearningPaths")
      .withIndex("by_user_skill", (q) =>
        q
          .eq("userId", appUser._id as Id<"appUsers">)
          .eq("aiSkillId", aiSkillId),
      )
      .collect();
    await Promise.all(
      existingPaths
        .filter((p) => p.status === "active")
        .map((p) =>
          ctx.db.patch(p._id, { status: "archived", updatedAt: now }),
        ),
    );

    const learningPathId = (await ctx.db.insert("aiLearningPaths", {
      userId: appUser._id as Id<"appUsers">,
      aiSkillId,
      assessmentId,
      modules: result.learningModules.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        duration: m.duration,
      })),
      status: "active",
      completedModuleIds: [],
      createdAt: now,
      updatedAt: now,
    })) as Id<"aiLearningPaths">;

    return { assessmentId, learningPathId } as const;
  },
});
