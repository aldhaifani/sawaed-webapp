import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./authz";
import { auth } from "./auth";
import type { MutationCtx } from "./_generated/server";

// ---------- Types ----------
export const AppLocale = v.union(v.literal("ar"), v.literal("en"));

interface CompletionParts {
  identity: boolean | number;
  skills: boolean;
  interests: boolean;
  education: boolean;
  projects: boolean;
  experiences: boolean;
  awards: boolean;
}

function weightedCompletion(parts: CompletionParts): number {
  // identity can be boolean or partial number (0..1)
  const identityScore =
    typeof parts.identity === "number"
      ? parts.identity
      : parts.identity
        ? 1
        : 0;
  const total =
    identityScore * 20 +
    (parts.skills ? 20 : 0) +
    (parts.interests ? 15 : 0) +
    (parts.education ? 15 : 0) +
    (parts.projects ? 10 : 0) +
    (parts.experiences ? 10 : 0) +
    (parts.awards ? 10 : 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

async function recomputeProfileCompletion(
  ctx: MutationCtx,
  userId: Id<"appUsers">,
): Promise<number> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const user = await ctx.db.get(userId);
  const skillsCount = await ctx.db
    .query("userSkills")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
    .then((r) => r.length);
  const interestsCount = await ctx.db
    .query("userInterests")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
    .then((r) => r.length);
  const educationAny = await ctx.db
    .query("education")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const projectsAny = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const expAny = await ctx.db
    .query("experiences")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const awardsAny = await ctx.db
    .query("awards")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const identityFields = [
    user?.firstName,
    user?.lastName,
    profile?.city,
    profile?.region,
    profile?.bio ?? profile?.headline,
  ];
  const identityFilled = identityFields.filter(
    (f) => typeof f === "string" && (f as string).trim().length > 0,
  ).length;
  const identityScore = identityFilled / identityFields.length; // partial credit

  const percent = weightedCompletion({
    identity: identityScore,
    skills: skillsCount > 0,
    interests: interestsCount > 0,
    education: !!educationAny,
    projects: !!projectsAny,
    experiences: !!expAny,
    awards: !!awardsAny,
  });

  if (profile) {
    await ctx.db.patch(profile._id, {
      completionPercentage: percent,
      updatedAt: Date.now(),
    });
  }
  return percent;
}

// ---------- Queries ----------
export const getMyProfileComposite = query({
  args: { locale: AppLocale },
  handler: async (ctx, { locale }) => {
    const appUser = await requireUser(ctx);
    if (!appUser) return null;
    const userId = appUser._id as Id<"appUsers">;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const skills = await ctx.db
      .query("userSkills")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const skillIds = skills.map((s) => s.skillId as Id<"skills">);
    const skillDocs = await Promise.all(skillIds.map((id) => ctx.db.get(id)));

    const interests = await ctx.db
      .query("userInterests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const interestIds = interests.map((i) => i.interestId as Id<"interests">);
    const interestDocs = await Promise.all(
      interestIds.map((id) => ctx.db.get(id)),
    );

    const education = await ctx.db
      .query("education")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
    const experiences = await ctx.db
      .query("experiences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
    const awards = await ctx.db
      .query("awards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();

    // Activities from eventRegistrations
    const activities = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const choose = (ar?: string | null, en?: string | null): string => {
      const arVal = (ar ?? "").trim();
      const enVal = (en ?? "").trim();
      return locale === "ar" ? arVal || enVal : enVal || arVal;
    };

    return {
      user: {
        id: appUser._id,
        email: appUser.email,
        firstName:
          (appUser as unknown as { firstName?: string }).firstName ?? undefined,
        lastName:
          (appUser as unknown as { lastName?: string }).lastName ?? undefined,
        phone: (appUser as unknown as { phone?: string }).phone ?? undefined,
      },
      profile: profile
        ? {
            id: profile._id,
            headline: profile.headline ?? undefined,
            bio: profile.bio ?? undefined,
            city: profile.city ?? undefined,
            region: profile.region ?? undefined,
            pictureUrl: profile.pictureUrl ?? undefined,
            collaborationStatus: profile.collaborationStatus ?? undefined,
            completionPercentage: profile.completionPercentage ?? 0,
          }
        : null,
      skills: skillDocs
        .filter(Boolean)
        .map((d) => ({
          id: d!._id as Id<"skills">,
          name: choose(d!.nameAr, d!.nameEn),
        })),
      interests: interestDocs
        .filter(Boolean)
        .map((d) => ({
          id: d!._id as Id<"interests">,
          name: choose(d!.nameAr, d!.nameEn),
        })),
      education,
      experiences,
      projects,
      awards,
      activities,
    };
  },
});

// ---------- Mutations: Basics ----------
export const updateProfileBasics = mutation({
  args: {
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    pictureUrl: v.optional(v.string()),
    collaborationStatus: v.optional(
      v.union(v.literal("open"), v.literal("closed"), v.literal("looking")),
    ),
  },
  handler: async (ctx, args) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!existing) {
      const id = await ctx.db.insert("profiles", {
        userId,
        headline: args.headline,
        bio: args.bio,
        city: args.city,
        region: args.region,
        pictureUrl: args.pictureUrl,
        collaborationStatus: args.collaborationStatus,
        completionPercentage: 0,
        createdAt: now,
        updatedAt: now,
      });
      await recomputeProfileCompletion(ctx, userId);
      return { id } as const;
    }

    const patch: any = { updatedAt: now };
    for (const k of [
      "headline",
      "bio",
      "city",
      "region",
      "pictureUrl",
      "collaborationStatus",
    ] as const) {
      if (k in args && typeof (args as any)[k] !== "undefined") {
        patch[k] = (args as any)[k];
      }
    }
    await ctx.db.patch(existing._id, patch);
    const completion = await recomputeProfileCompletion(ctx, userId);
    return { id: existing._id, completion } as const;
  },
});

// ---------- User basics: phone & picture helpers ----------
export const updateUserPhone = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const appUser = await requireUser(ctx);
    const now = Date.now();
    // Basic server-side validation for Oman numbers as requested: +968 followed by 9 digits
    const valid = /^\+968\d{9}$/.test(phone);
    if (!valid) throw new Error("INVALID_PHONE");
    await ctx.db.patch(appUser._id as Id<"appUsers">, {
      phone,
      updatedAt: now,
    });
    return { ok: true } as const;
  },
});

export const clearProfilePicture = mutation({
  args: {},
  handler: async (ctx) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) return { ok: true } as const;
    await ctx.db.patch(existing._id, {
      pictureUrl: undefined,
      updatedAt: Date.now(),
    });
    await recomputeProfileCompletion(ctx, userId);
    return { ok: true } as const;
  },
});

// ---------- Mutations: Taxonomies replace operation ----------
export const setUserTaxonomies = mutation({
  args: {
    skillIds: v.array(v.id("skills")),
    interestIds: v.array(v.id("interests")),
  },
  handler: async (ctx, { skillIds, interestIds }) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();

    // Skills
    const existingSkills = await ctx.db
      .query("userSkills")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const existingSkillIds = new Set(
      existingSkills.map((r) => r.skillId as Id<"skills">),
    );
    const nextSkillIds = new Set(skillIds);

    // Delete removed
    for (const row of existingSkills) {
      if (!nextSkillIds.has(row.skillId as Id<"skills">)) {
        await ctx.db.delete(row._id);
      }
    }
    // Add new
    for (const sid of nextSkillIds) {
      if (!existingSkillIds.has(sid)) {
        await ctx.db.insert("userSkills", {
          userId,
          skillId: sid,
          createdAt: now,
        });
      }
    }

    // Interests
    const existingInterests = await ctx.db
      .query("userInterests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const existingInterestIds = new Set(
      existingInterests.map((r) => r.interestId as Id<"interests">),
    );
    const nextInterestIds = new Set(interestIds);

    for (const row of existingInterests) {
      if (!nextInterestIds.has(row.interestId as Id<"interests">)) {
        await ctx.db.delete(row._id);
      }
    }
    for (const iid of nextInterestIds) {
      if (!existingInterestIds.has(iid)) {
        await ctx.db.insert("userInterests", {
          userId,
          interestId: iid,
          createdAt: now,
        });
      }
    }

    await recomputeProfileCompletion(ctx, userId);
    return { ok: true } as const;
  },
});

// ---------- Section CRUD helpers ----------
const nonEmpty = (s: string | undefined): boolean =>
  typeof s === "string" && s.trim().length > 0;

export const createEducation = mutation({
  args: {
    institution: v.string(),
    degree: v.string(),
    field: v.optional(v.string()),
    startYear: v.optional(v.number()),
    endYear: v.optional(v.union(v.number(), v.literal("Present"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    if (!nonEmpty(args.institution) || !nonEmpty(args.degree))
      throw new Error("VALIDATION_ERROR");
    const id = await ctx.db.insert("education", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    await recomputeProfileCompletion(ctx, userId);
    return { id } as const;
  },
});

export const updateEducation = mutation({
  args: {
    id: v.id("education"),
    institution: v.optional(v.string()),
    degree: v.optional(v.string()),
    field: v.optional(v.string()),
    startYear: v.optional(v.number()),
    endYear: v.optional(v.union(v.number(), v.literal("Present"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const appUser = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("NOT_FOUND");
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    await recomputeProfileCompletion(ctx, appUser._id as Id<"appUsers">);
    return { ok: true } as const;
  },
});

export const deleteEducation = mutation({
  args: { id: v.id("education") },
  handler: async (ctx, { id }) => {
    const appUser = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("NOT_FOUND");
    await ctx.db.delete(id);
    await recomputeProfileCompletion(ctx, appUser._id as Id<"appUsers">);
    return { ok: true } as const;
  },
});

export const createExperience = mutation({
  args: {
    title: v.string(),
    organization: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    if (!nonEmpty(args.title) || !nonEmpty(args.organization))
      throw new Error("VALIDATION_ERROR");
    const id = await ctx.db.insert("experiences", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    await recomputeProfileCompletion(ctx, userId);
    return { id } as const;
  },
});

export const updateExperience = mutation({
  args: {
    id: v.id("experiences"),
    title: v.optional(v.string()),
    organization: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const appUser = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("NOT_FOUND");
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    await recomputeProfileCompletion(ctx, appUser._id as Id<"appUsers">);
    return { ok: true } as const;
  },
});

export const deleteExperience = mutation({
  args: { id: v.id("experiences") },
  handler: async (ctx, { id }) => {
    const appUser = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("NOT_FOUND");
    await ctx.db.delete(id);
    await recomputeProfileCompletion(ctx, appUser._id as Id<"appUsers">);
    return { ok: true } as const;
  },
});

export const createProject = mutation({
  args: {
    title: v.string(),
    period: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    if (!nonEmpty(args.title)) throw new Error("VALIDATION_ERROR");
    const id = await ctx.db.insert("projects", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    await recomputeProfileCompletion(ctx, userId);
    return { id } as const;
  },
});

export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    title: v.optional(v.string()),
    period: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const appUser = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("NOT_FOUND");
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    await recomputeProfileCompletion(ctx, appUser._id as Id<"appUsers">);
    return { ok: true } as const;
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const appUser = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("NOT_FOUND");
    await ctx.db.delete(id);
    await recomputeProfileCompletion(ctx, appUser._id as Id<"appUsers">);
    return { ok: true } as const;
  },
});

export const createAward = mutation({
  args: {
    title: v.string(),
    issuer: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const now = Date.now();
    if (!nonEmpty(args.title)) throw new Error("VALIDATION_ERROR");
    const id = await ctx.db.insert("awards", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    await recomputeProfileCompletion(ctx, userId);
    return { id } as const;
  },
});

export const updateAward = mutation({
  args: {
    id: v.id("awards"),
    title: v.optional(v.string()),
    issuer: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const appUser = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("NOT_FOUND");
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    await recomputeProfileCompletion(ctx, appUser._id as Id<"appUsers">);
    return { ok: true } as const;
  },
});

export const deleteAward = mutation({
  args: { id: v.id("awards") },
  handler: async (ctx, { id }) => {
    const appUser = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== (appUser._id as Id<"appUsers">))
      throw new Error("NOT_FOUND");
    await ctx.db.delete(id);
    await recomputeProfileCompletion(ctx, appUser._id as Id<"appUsers">);
    return { ok: true } as const;
  },
});

// ---------- Storage helpers for profile picture ----------
export const generateProfilePictureUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("UNAUTHENTICATED");
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl } as const;
  },
});

export const setProfilePictureFromStorageId = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const appUser = await requireUser(ctx);
    const userId = appUser._id as Id<"appUsers">;
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const pictureUrl = await ctx.storage.getUrl(storageId);
    const now = Date.now();
    if (!existing) {
      const id = await ctx.db.insert("profiles", {
        userId,
        pictureUrl: pictureUrl ?? undefined,
        completionPercentage: 0,
        createdAt: now,
        updatedAt: now,
      });
      await recomputeProfileCompletion(ctx, userId);
      return { id } as const;
    }
    await ctx.db.patch(existing._id, {
      pictureUrl: pictureUrl ?? undefined,
      updatedAt: now,
    });
    const completion = await recomputeProfileCompletion(ctx, userId);
    return { id: existing._id, completion } as const;
  },
});
