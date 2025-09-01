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

    // Optimized: Use index and limit results for better performance
    const skills = await ctx.db
      .query("aiSkills")
      .withIndex("by_created_at")
      .order("desc")
      .take(50); // Limit to 50 most recent skills

    // Batch related data fetching for better performance
    const allRelSkillIds = skills.flatMap((s) => s.relatedSkillIds ?? []);
    const allRelInterestIds = skills.flatMap((s) => s.relatedInterestIds ?? []);

    const [relatedSkillsMap, relatedInterestsMap] = await Promise.all([
      Promise.all(allRelSkillIds.map((id) => ctx.db.get(id))).then(
        (results) =>
          new Map(
            results.filter(Boolean).map((sk) => [
              sk!._id,
              {
                _id: sk!._id,
                nameEn: sk!.nameEn as string,
                nameAr: sk!.nameAr as string,
              },
            ]),
          ),
      ),
      Promise.all(allRelInterestIds.map((id) => ctx.db.get(id))).then(
        (results) =>
          new Map(
            results.filter(Boolean).map((it) => [
              it!._id,
              {
                _id: it!._id,
                nameEn: it!.nameEn as string,
                nameAr: it!.nameAr as string,
              },
            ]),
          ),
      ),
    ]);

    const enriched = skills.map((s) => {
      const relSkillIds = s.relatedSkillIds ?? [];
      const relInterestIds = s.relatedInterestIds ?? [];
      const relatedSkills = relSkillIds
        .map((id) => relatedSkillsMap.get(id))
        .filter(Boolean);
      const relatedInterests = relInterestIds
        .map((id) => relatedInterestsMap.get(id))
        .filter(Boolean);

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
    });

    return enriched;
  },
});

/**
 * Unenroll from the specified learning path by archiving it.
 * - Validates ownership
 * - Sets status to "archived"
 */
export const unenrollLearningPath = mutation({
  args: { learningPathId: v.id("aiLearningPaths") },
  handler: async (ctx, { learningPathId }) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;

    const path = await ctx.db.get(learningPathId);
    if (!path) throw new Error("Learning path not found");
    if (path.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("Forbidden");

    const now = Date.now();
    await ctx.db.patch(learningPathId, {
      status: "archived",
      updatedAt: now,
    });
    return { status: "archived" } as const;
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
 * Optimized function that combines startAssessment and user profile data
 * in a single database operation to reduce latency for prompt building.
 */
export const startAssessmentWithProfile = mutation({
  args: {
    aiSkillId: v.id("aiSkills"),
    locale: v.union(v.literal("ar"), v.literal("en")),
  },
  handler: async (ctx, { aiSkillId, locale }) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;

    // Batch fetch user data first, then profile
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();

    if (!appUser || appUser.role !== "YOUTH") return null;

    // Batch fetch all assessment-related data in parallel
    const [skill, assessments, paths] = await Promise.all([
      ctx.db.get(aiSkillId),
      ctx.db
        .query("aiAssessments")
        .withIndex("by_user_skill", (q) =>
          q
            .eq("userId", appUser._id as Id<"appUsers">)
            .eq("aiSkillId", aiSkillId),
        )
        .collect(),
      ctx.db
        .query("aiLearningPaths")
        .withIndex("by_user_skill", (q) =>
          q
            .eq("userId", appUser._id as Id<"appUsers">)
            .eq("aiSkillId", aiSkillId),
        )
        .collect(),
    ]);

    if (!skill) throw new Error("Skill not found");

    const latestAssessment = assessments.sort(
      (a, b) => b.createdAt - a.createdAt,
    )[0];

    const activeLearningPath = paths
      .filter((p) => p.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    // Extract first name based on locale
    const firstName =
      locale === "ar"
        ? appUser.firstNameAr || appUser.firstNameEn
        : appUser.firstNameEn || appUser.firstNameAr;

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
      user: {
        firstName: firstName || undefined,
        languagePreference: appUser.languagePreference,
      },
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
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;

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

    if (!latestActive) return null;

    // Fetch the linked assessment to expose level for UI rendering of templates
    const assessment = latestActive.assessmentId
      ? await ctx.db.get(latestActive.assessmentId as Id<"aiAssessments">)
      : undefined;

    return {
      _id: latestActive._id as Id<"aiLearningPaths">,
      modules: latestActive.modules,
      status: latestActive.status,
      completedModuleIds: latestActive.completedModuleIds ?? [],
      createdAt: latestActive.createdAt,
      updatedAt: latestActive.updatedAt,
      assessmentId: latestActive.assessmentId as
        | Id<"aiAssessments">
        | undefined,
      assessmentLevel: assessment?.level as number | undefined,
    } as const;
  },
});

/**
 * Fetch the latest active learning path for the authenticated user (any skill).
 * Used by the Learning page to determine whether to show the active path UI
 * regardless of the user's current aiChatConfigs selection.
 */
export const getMyActiveLearningPath = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;

    const paths = await ctx.db
      .query("aiLearningPaths")
      .withIndex("by_user", (q) =>
        q.eq("userId", appUser._id as Id<"appUsers">),
      )
      .collect();

    const latestActive = paths
      .filter((p) => p.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!latestActive) return null;

    const assessment = latestActive.assessmentId
      ? await ctx.db.get(latestActive.assessmentId as Id<"aiAssessments">)
      : undefined;

    return {
      _id: latestActive._id as Id<"aiLearningPaths">,
      modules: latestActive.modules,
      status: latestActive.status,
      completedModuleIds: latestActive.completedModuleIds ?? [],
      createdAt: latestActive.createdAt,
      updatedAt: latestActive.updatedAt,
      assessmentId: latestActive.assessmentId as
        | Id<"aiAssessments">
        | undefined,
      assessmentLevel: assessment?.level as number | undefined,
    } as const;
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

/**
 * Mark a module as completed in the specified learning path.
 * - Validates ownership
 * - Ensures the module exists in the path
 * - Adds the moduleId to completedModuleIds (idempotent)
 * - Auto-completes the path if all modules are completed
 */
export const markModuleCompleted = mutation({
  args: {
    learningPathId: v.id("aiLearningPaths"),
    moduleId: v.string(),
  },
  handler: async (ctx, { learningPathId, moduleId }) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;

    const path = await ctx.db.get(learningPathId);
    if (!path) throw new Error("Learning path not found");
    if (path.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("Forbidden");
    if (path.status !== "active") return { status: path.status } as const;

    const existsInModules = path.modules.some((m) => m.id === moduleId);
    if (!existsInModules) throw new Error("Module not found in path");

    const now = Date.now();
    const prev = new Set<string>(path.completedModuleIds ?? []);
    prev.add(moduleId);
    const completed = Array.from(prev);

    // Determine if the path is now fully completed
    const allDone = path.modules.every((m) => completed.includes(m.id));
    if (allDone) {
      await ctx.db.patch(learningPathId, {
        completedModuleIds: completed,
        status: "completed",
        updatedAt: now,
      });
      return { status: "completed", completedModuleIds: completed } as const;
    }

    await ctx.db.patch(learningPathId, {
      completedModuleIds: completed,
      updatedAt: now,
    });
    return { status: "active", completedModuleIds: completed } as const;
  },
});

/**
 * Mark a module as incomplete in the specified learning path.
 * - Validates ownership
 * - Ensures the module exists in the path
 * - Removes the moduleId from completedModuleIds (idempotent)
 * - If the path was completed, it will be re-opened to active
 */
export const markModuleIncomplete = mutation({
  args: {
    learningPathId: v.id("aiLearningPaths"),
    moduleId: v.string(),
  },
  handler: async (ctx, { learningPathId, moduleId }) => {
    const authUserId = await auth.getUserId(ctx);
    if (!authUserId) return null;
    const appUser = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!appUser || appUser.role !== "YOUTH") return null;

    const path = await ctx.db.get(learningPathId);
    if (!path) throw new Error("Learning path not found");
    if (path.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("Forbidden");

    const existsInModules = path.modules.some((m) => m.id === moduleId);
    if (!existsInModules) throw new Error("Module not found in path");

    const now = Date.now();
    const current = new Set<string>(path.completedModuleIds ?? []);
    current.delete(moduleId);
    const updated = Array.from(current);

    // If any module is now incomplete, ensure status is active
    const status = "active" as const;
    await ctx.db.patch(learningPathId, {
      completedModuleIds: updated,
      status,
      updatedAt: now,
    });
    return { status, completedModuleIds: updated } as const;
  },
});
