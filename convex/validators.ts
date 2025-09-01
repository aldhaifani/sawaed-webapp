import { v } from "convex/values";

// ---------- Constants ----------
export const ALLOWED_MODULE_TYPES = [
  "article",
  "video",
  "quiz",
  "project",
] as const;

export const MIN_MODULES = 3 as const;
export const MAX_MODULES = 6 as const;
export const MAX_REASONING_LEN = 2000 as const;
// e.g., "6 min", "15 mins", "1 h", "2 hours" (human-readable)
export const DURATION_REGEX =
  /^(\d{1,3})\s?(min|mins|minutes|h|hr|hrs|hour|hours)$/i;

// ---------- Convex Validators ----------
export const ModuleItemV = v.object({
  id: v.string(),
  title: v.string(),
  type: v.union(
    v.literal("article"),
    v.literal("video"),
    v.literal("quiz"),
    v.literal("project"),
  ),
  duration: v.string(),
  // Optional richer fields for better UX/rendering
  description: v.optional(v.string()),
  objectives: v.optional(v.array(v.string())),
  outline: v.optional(v.array(v.string())),
  // Either provide a real resource URL (preferred) or search keywords
  resourceUrl: v.optional(v.string()),
  resourceTitle: v.optional(v.string()),
  searchKeywords: v.optional(v.array(v.string())),
  // Additional metadata
  levelRef: v.optional(v.number()),
  difficulty: v.optional(
    v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced"),
    ),
  ),
});

export const AssessmentResultV = v.object({
  level: v.number(),
  confidence: v.number(),
  reasoning: v.optional(v.string()),
  learningModules: v.array(ModuleItemV),
});

// ---------- Types ----------
export type ModuleType = (typeof ALLOWED_MODULE_TYPES)[number];
export type ModuleItem = {
  readonly id: string;
  readonly title: string;
  readonly type: ModuleType;
  readonly duration: string;
  readonly description?: string;
  readonly objectives?: ReadonlyArray<string>;
  readonly outline?: ReadonlyArray<string>;
  readonly resourceUrl?: string;
  readonly resourceTitle?: string;
  readonly searchKeywords?: ReadonlyArray<string>;
  readonly levelRef?: number;
  readonly difficulty?: "beginner" | "intermediate" | "advanced";
};
export type AssessmentResult = {
  readonly level: number;
  readonly confidence: number; // 0..1
  readonly reasoning?: string;
  readonly learningModules: ReadonlyArray<ModuleItem>;
};

// ---------- Guards / Assertions ----------
export function assertValidConfidence(value: number): void {
  const ok = Number.isFinite(value) && value >= 0 && value <= 1;
  if (!ok) throw new Error("Invalid confidence; expected 0..1");
}

export function assertValidDurationLabel(value: string): void {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error("Invalid module.duration");
  // Soft guard: only enforce format if it loosely matches our conventions
  if (!DURATION_REGEX.test(value.trim())) {
    // Keep it non-breaking: allow but cap length and ensure it contains a number
    if (!/\d/.test(value) || value.length > 32) {
      throw new Error("Invalid module.duration format");
    }
  }
}

export function assertValidModules(
  mods: ReadonlyArray<ModuleItem>,
  opts: { min?: number; max?: number } = {},
): void {
  const min = opts.min ?? MIN_MODULES;
  const max = opts.max ?? MAX_MODULES;
  if (!Array.isArray(mods)) throw new Error("Invalid modules array");
  if (mods.length < min || mods.length > max)
    throw new Error(`Invalid modules length; expected ${min}-${max}`);
  const seenIds = new Set<string>();
  for (const m of mods) {
    if (typeof m.id !== "string" || m.id.trim().length === 0)
      throw new Error("Invalid module.id");
    if (seenIds.has(m.id)) throw new Error("Duplicate module.id values");
    seenIds.add(m.id);
    if (typeof m.title !== "string" || m.title.trim().length === 0)
      throw new Error("Invalid module.title");
    if (!ALLOWED_MODULE_TYPES.includes(m.type))
      throw new Error("Invalid module.type");
    assertValidDurationLabel(m.duration);
    // Optional field validations (non-breaking)
    if (m.description !== undefined && m.description.trim().length === 0)
      throw new Error("Invalid module.description");
    if (m.objectives !== undefined) {
      if (!Array.isArray(m.objectives) || m.objectives.length === 0)
        throw new Error(
          "module.objectives must be a non-empty array when provided",
        );
      for (const o of m.objectives) {
        if (typeof o !== "string" || o.trim().length === 0)
          throw new Error("Invalid objectives entry");
      }
    }
    if (m.outline !== undefined) {
      if (!Array.isArray(m.outline) || m.outline.length === 0)
        throw new Error(
          "module.outline must be a non-empty array when provided",
        );
      for (const o of m.outline) {
        if (typeof o !== "string" || o.trim().length === 0)
          throw new Error("Invalid outline entry");
      }
    }
    if (m.searchKeywords !== undefined) {
      if (!Array.isArray(m.searchKeywords) || m.searchKeywords.length === 0)
        throw new Error(
          "module.searchKeywords must be a non-empty array when provided",
        );
      if (m.searchKeywords.length > 12)
        throw new Error("Too many searchKeywords (max 12)");
      for (const kw of m.searchKeywords) {
        if (typeof kw !== "string" || kw.trim().length === 0)
          throw new Error("Invalid searchKeywords entry");
      }
    }
    if (m.resourceUrl !== undefined) {
      if (
        typeof m.resourceUrl !== "string" ||
        m.resourceUrl.trim().length === 0
      )
        throw new Error("Invalid module.resourceUrl");
      if (!/^https?:\/\//i.test(m.resourceUrl))
        throw new Error("resourceUrl must be http(s)");
      if (m.resourceUrl.length > 2048) throw new Error("resourceUrl too long");
    }
    if (m.resourceTitle !== undefined && m.resourceTitle.trim().length === 0)
      throw new Error("Invalid module.resourceTitle");
    if (m.levelRef !== undefined && !Number.isFinite(m.levelRef))
      throw new Error("Invalid module.levelRef");
    if (
      m.difficulty !== undefined &&
      !["beginner", "intermediate", "advanced"].includes(m.difficulty)
    )
      throw new Error("Invalid module.difficulty");
  }
}

export function assertValidAssessmentResult(
  result: AssessmentResult,
  allowedLevels: ReadonlySet<number>,
  opts: { minModules?: number; maxModules?: number } = {},
): void {
  if (!Number.isInteger(result.level))
    throw new Error("Level must be an integer");
  if (!allowedLevels.has(result.level))
    throw new Error("Invalid level for selected skill");
  assertValidConfidence(result.confidence);
  if (
    typeof result.reasoning === "string" &&
    result.reasoning.length > MAX_REASONING_LEN
  )
    throw new Error("Reasoning too long");
  assertValidModules(result.learningModules, {
    min: opts.minModules ?? MIN_MODULES,
    max: opts.maxModules ?? MAX_MODULES,
  });
}

export function assertValidLearningPathProgress(
  modules: ReadonlyArray<ModuleItem>,
  completedModuleIds: ReadonlyArray<string>,
): void {
  if (!Array.isArray(completedModuleIds))
    throw new Error("Invalid completedModuleIds");
  const moduleIdSet = new Set<string>(modules.map((m) => m.id));
  const seen = new Set<string>();
  for (const id of completedModuleIds) {
    if (typeof id !== "string" || id.trim().length === 0)
      throw new Error("Invalid completedModuleIds entry");
    if (seen.has(id)) throw new Error("Duplicate completedModuleIds values");
    if (!moduleIdSet.has(id))
      throw new Error("completedModuleIds must be subset of modules");
    seen.add(id);
  }
}

export function assertValidSkillLevels(
  levels: ReadonlyArray<{
    level: number;
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
  }>,
): void {
  if (!Array.isArray(levels) || levels.length === 0)
    throw new Error("Levels must be a non-empty array");
  const seen = new Set<number>();
  let prev = 0;
  for (const l of levels) {
    if (!Number.isInteger(l.level) || l.level < 1)
      throw new Error("Level numbers must be integers >= 1");
    if (seen.has(l.level)) throw new Error("Duplicate level values");
    if (l.level <= prev) throw new Error("Levels must be strictly increasing");
    if (!l.nameEn?.trim() || !l.nameAr?.trim())
      throw new Error("Level names must be non-empty (EN/AR)");
    if (!l.descriptionEn?.trim() || !l.descriptionAr?.trim())
      throw new Error("Level descriptions must be non-empty (EN/AR)");
    seen.add(l.level);
    prev = l.level;
  }
}
