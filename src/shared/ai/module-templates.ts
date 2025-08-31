import { z } from "zod";
import rawTemplates from "../../../data/learning_path/module_templates.json";

/**
 * ModuleTemplates provides validated, typed access to per-level, per-content-type,
 * and per-locale learning module templates used by the AI prompt builder.
 *
 * Data source: `data/learning_path/module_templates.json`
 */
class ModuleTemplates {
  private static readonly localeSchema = z.union([
    z.literal("en"),
    z.literal("ar"),
  ]);
  private static readonly contentTypeSchema = z.union([
    z.literal("article"),
    z.literal("video"),
    z.literal("quiz"),
    z.literal("project"),
  ]);

  private static readonly templateFieldsSchema = z.object({
    titlePatterns: z.array(z.string().min(1)).min(1),
    objectives: z.array(z.string().min(1)).min(1),
    durationBand: z.string().min(1),
    outline: z.array(z.string().min(1)).min(1),
    evaluationHints: z.array(z.string().min(1)).optional(),
  });

  private static readonly perLocaleSchema = z.object({
    en: ModuleTemplates.templateFieldsSchema,
    ar: ModuleTemplates.templateFieldsSchema,
  });

  private static readonly levelTemplatesSchema = z.object({
    article: ModuleTemplates.perLocaleSchema,
    video: ModuleTemplates.perLocaleSchema,
    quiz: ModuleTemplates.perLocaleSchema,
    project: ModuleTemplates.perLocaleSchema,
  });

  private static readonly levelEntrySchema = z.object({
    level: z.number().int().min(1).max(10),
    templates: ModuleTemplates.levelTemplatesSchema,
  });

  private static readonly rootSchema = z.object({
    templateVersion: z.string().min(1),
    levels: z.array(ModuleTemplates.levelEntrySchema).min(5),
  });

  private static readonly data = ModuleTemplates.rootSchema.parse(rawTemplates);

  /**
   * Get the template version string from data file.
   */
  public static getVersion(): string {
    return ModuleTemplates.data.templateVersion;
  }

  /**
   * Get level entry by numeric level (1..10).
   */
  public static getLevel(
    level: number,
  ): z.infer<typeof ModuleTemplates.levelEntrySchema> {
    const found = ModuleTemplates.data.levels.find((l) => l.level === level);
    if (!found) throw new Error(`ModuleTemplates: level not found: ${level}`);
    return found;
  }

  /**
   * Get template fields for a given level, content type, and locale.
   */
  public static getTemplate(params: {
    level: number;
    type: z.infer<typeof ModuleTemplates.contentTypeSchema>;
    locale: z.infer<typeof ModuleTemplates.localeSchema>;
  }): z.infer<typeof ModuleTemplates.templateFieldsSchema> {
    const { level, type, locale } = params;
    const entry = ModuleTemplates.getLevel(level);
    const perLocale = (entry.templates as Record<string, unknown>)[
      type
    ] as z.infer<typeof ModuleTemplates.perLocaleSchema>;
    return perLocale[locale];
  }

  /**
   * Create a concise, single-paragraph instruction suitable for system prompts.
   * Keeps instructions short while preserving guidance and constraints.
   */
  public static toConciseInstruction(params: {
    level: number;
    type: z.infer<typeof ModuleTemplates.contentTypeSchema>;
    locale: z.infer<typeof ModuleTemplates.localeSchema>;
    skillToken?: string; // optional replacement for {{skill}}
  }): string {
    const { level, type, locale, skillToken } = params;
    const t = ModuleTemplates.getTemplate({ level, type, locale });

    const replaceSkill = (s: string): string =>
      skillToken ? s.replaceAll("{{skill}}", skillToken) : s;

    const title = replaceSkill(t.titlePatterns[0] ?? "");
    const obj = t.objectives.slice(0, 2).map(replaceSkill).join("; ");
    const outline = t.outline.slice(0, 3).map(replaceSkill).join(" → ");
    const evalHint = t.evaluationHints?.[0]
      ? `; Eval: ${replaceSkill(t.evaluationHints[0])}`
      : "";

    // Example EN: "L3 project | 'Plan and Execute...' | Goals: Use a framework; Write summary | 30–45 min | Steps: Select framework → Apply in 3–4 steps → Summarize outcome; Eval: Check method fit"
    // Example AR keeps same structure with Arabic text from data.
    return [
      `L${level} ${type}`,
      `"${title}"`,
      obj ? `Goals: ${obj}` : undefined,
      t.durationBand,
      outline ? `Steps: ${outline}` : undefined,
      evalHint || undefined,
    ]
      .filter(Boolean)
      .join(" | ");
  }
}

export { ModuleTemplates };
