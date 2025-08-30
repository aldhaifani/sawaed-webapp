import { fetchMutation } from "convex/nextjs";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";
import {
  ALLOWED_MODULE_TYPES,
  MIN_MODULES,
  MAX_MODULES,
} from "@/shared/ai/constants";
import * as Sentry from "@sentry/nextjs";

// Local fallback data (static skill definitions and level descriptors)
// Loaded only on the server; used when Convex context is unavailable or to enrich details
import localSkillsData from "../../../../data/learning_path/ai_skills.json" assert { type: "json" };

type LocalResource = {
  readonly url: string;
};

type LocalLevel = {
  readonly level: number;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly descriptionEn?: string;
  readonly descriptionAr?: string;
  readonly questions?: readonly string[];
  readonly evaluation?: readonly string[];
  readonly progressionSteps?: readonly string[];
  readonly resources?: readonly LocalResource[];
};

type LocalSkill = {
  readonly nameEn: string;
  readonly nameAr: string;
  readonly definitionEn?: string;
  readonly definitionAr?: string;
  readonly levels: readonly LocalLevel[];
};

const localSkills = localSkillsData as unknown as readonly LocalSkill[];

export type Locale = "ar" | "en";

export type BuildPromptInput = {
  readonly aiSkillId: string;
  readonly locale: Locale;
  readonly convexToken?: string | null;
};

export type BuildPromptOutput = {
  readonly systemPrompt: string;
};

function pick<T>(cond: boolean, a: T, b: T): T {
  return cond ? a : b;
}

// Narrow types for Convex result to avoid any usage
type ConvexAiSkill = {
  readonly nameEn: string;
  readonly nameAr: string;
  readonly definitionEn?: string;
  readonly definitionAr?: string;
  readonly levels?: unknown;
};

type StartAssessmentResult = {
  readonly aiSkill?: ConvexAiSkill;
  readonly latestAssessment?: {
    readonly level: number;
    readonly confidence: number;
  };
};

type SummaryLevel = {
  readonly level: number;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly descriptionEn?: string;
  readonly descriptionAr?: string;
};

function isSummaryLevel(x: unknown): x is SummaryLevel {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.level === "number" &&
    typeof o.nameEn === "string" &&
    typeof o.nameAr === "string" &&
    (o.descriptionEn === undefined || typeof o.descriptionEn === "string") &&
    (o.descriptionAr === undefined || typeof o.descriptionAr === "string")
  );
}

function normalizeLevels(input: unknown): ReadonlyArray<SummaryLevel> {
  if (!Array.isArray(input)) return [];
  const out: SummaryLevel[] = [];
  for (const item of input) {
    if (isSummaryLevel(item)) out.push(item);
  }
  return out;
}

function levelTemplatesSection(
  locale: Locale,
  localLevels: readonly LocalLevel[],
  latestLevel?: number,
): string | undefined {
  if (!localLevels || localLevels.length === 0) return undefined;
  const header = pick(
    locale === "ar",
    "قوالب حسب المستوى:",
    "Per-level templates:",
  );
  const lines: string[] = [header];
  const sorted = [...localLevels].sort(
    (a, b) => (a.level ?? 0) - (b.level ?? 0),
  );
  for (const l of sorted) {
    const lvl = l.level as number | undefined;
    const title = pick(locale === "ar", l.nameAr, l.nameEn);
    const mark =
      latestLevel !== undefined && lvl === latestLevel
        ? pick(locale === "ar", " (آخر تقييم)", " (latest)")
        : "";
    lines.push(`- L${lvl}: ${title}${mark}`);
    const qArr = l.questions ?? [];
    const evArr = l.evaluation ?? [];
    const pgArr = l.progressionSteps ?? [];
    const rsArr = l.resources ?? [];
    if (qArr.length > 0)
      lines.push(
        `  • ${pick(locale === "ar", "أسئلة:", "Questions:")} ${qArr.slice(0, 2).join(" | ")}`,
      );
    if (evArr.length > 0)
      lines.push(
        `  • ${pick(locale === "ar", "تقييم:", "Evaluation:")} ${evArr.slice(0, 1).join(" | ")}`,
      );
    if (pgArr.length > 0)
      lines.push(
        `  • ${pick(locale === "ar", "خطوات التقدم:", "Progression steps:")} ${pgArr.slice(0, 2).join(" | ")}`,
      );
    if (rsArr.length > 0)
      lines.push(
        `  • ${pick(locale === "ar", "مصادر:", "Resources:")} ${rsArr
          .slice(0, 2)
          .map((r) => r.url)
          .join(" | ")}`,
      );
  }
  return lines.join("\n");
}

function safeJoin(lines: readonly (string | undefined | null)[]): string {
  return lines.filter(Boolean).join("\n");
}

function findLocalSkillByNames(
  nameEn?: string | null,
  nameAr?: string | null,
): LocalSkill | undefined {
  if (!nameEn && !nameAr) return undefined;
  return localSkills.find((s) => {
    const nEn = s.nameEn?.toLowerCase();
    const nAr = s.nameAr?.toLowerCase();
    const enMatch = nameEn != null && nEn === nameEn.toLowerCase();
    const arMatch = nameAr != null && nAr === nameAr.toLowerCase();
    return enMatch || arMatch;
  });
}

function levelsSummary(
  locale: Locale,
  levels: ReadonlyArray<{
    level: number;
    nameEn: string;
    nameAr: string;
    descriptionEn?: string;
    descriptionAr?: string;
  }>,
): string {
  const lines: string[] = [];
  lines.push(pick(locale === "ar", "مستويات المهارة:", "Skill Levels:"));
  for (const lvl of levels) {
    const title = pick(locale === "ar", lvl.nameAr, lvl.nameEn);
    const desc = pick(
      locale === "ar",
      lvl.descriptionAr ?? "",
      lvl.descriptionEn ?? "",
    );
    lines.push(`- L${lvl.level}: ${title}${desc ? ` — ${desc}` : ""}`);
  }
  return lines.join("\n");
}

function moduleConstraints(locale: Locale): string {
  const types = Array.from(ALLOWED_MODULE_TYPES).join(" | ");
  return safeJoin([
    pick(locale === "ar", "قيود مسار التعلم:", "Learning Path constraints:"),
    pick(
      locale === "ar",
      `- استخدم من ${MIN_MODULES} إلى ${MAX_MODULES} عناصر تعليمية.`,
      `- Use between ${MIN_MODULES} and ${MAX_MODULES} learning modules.`,
    ),
    pick(
      locale === "ar",
      `- الأنواع المسموح بها: ${types}.`,
      `- Allowed types: ${types}.`,
    ),
    pick(
      locale === "ar",
      "- المدة بصيغة بشرية مثل: 10 دقائق، 1 ساعة.",
      "- Duration must be human-readable (e.g., 10 minutes, 1 hour).",
    ),
  ]);
}

function schemaInstruction(locale: Locale): string {
  return safeJoin([
    pick(
      locale === "ar",
      "\n\nالتعليمات الخاصة بالمخرجات:",
      "\n\nOutput Instructions:",
    ),
    pick(
      locale === "ar",
      "في النهاية أخرج كتلة واحدة فقط من JSON الصالح داخل سياج ```json بدون أي نص قبلها أو بعدها، وتطابق هذا المخطط:",
      "At the end, output exactly one valid JSON block inside a ```json fenced code block with no prose before or after, matching this schema:",
    ),
    "{",
    "  skill?: string,",
    "  level: number (1-5),",
    "  confidence: number (0-1),",
    "  reasoning?: string,",
    "  learningModules: Array<",
    "    { id: string, title: string, type: 'article'|'video'|'quiz'|'project', duration: string }",
    pick(
      locale === "ar",
      "  > بطول من 3 إلى 6",
      "  > with length between 3 and 6",
    ),
    "}",
    pick(
      locale === "ar",
      "لا تضف مفاتيح إضافية ولا تعليقات. إذا استخدمت 'modules' فحوِّلها إلى 'learningModules'.",
      "Do not include extra keys or comments. If you used 'modules', rename it to 'learningModules'.",
    ),
    pick(
      locale === "ar",
      "تأكَّد من إغلاق الكتلة بـ ``` وعدم إضافة أي نص بعد JSON.",
      "Ensure the block ends with ``` and no trailing text after the JSON.",
    ),
  ]);
}

function bilingualToneRules(locale: Locale): string {
  return safeJoin([
    pick(
      locale === "ar",
      "\n\nقواعد اللغة والنبرة:",
      "\n\nLanguage and tone rules:",
    ),
    pick(
      locale === "ar",
      "- استخدم لغة المستخدم الحالية (عربي/إنجليزي). إذا غيّر المستخدم اللغة فغيّر معها.",
      "- Use the user's current language (Arabic/English). If the user switches, switch too.",
    ),
    pick(
      locale === "ar",
      "- أسلوب ودود ومهني ومشجِّع. اجعل الجمل قصيرة وواضحة.",
      "- Friendly, professional, and encouraging tone. Keep sentences short and clear.",
    ),
  ]);
}

function turnTakingRules(locale: Locale): string {
  return safeJoin([
    pick(locale === "ar", "\n\nقواعد تبادل الأدوار:", "\n\nTurn-taking rules:"),
    pick(
      locale === "ar",
      "- اطرح سؤالاً واحدًا في كل مرة وانتظر رد المستخدم قبل المتابعة.",
      "- Ask one question at a time and wait for the user's reply before proceeding.",
    ),
    pick(
      locale === "ar",
      "- إذا كان الرد غير واضح، اطلُب توضيحاً بسؤال قصير محدد.",
      "- If the reply is unclear, ask a brief clarifying follow-up.",
    ),
  ]);
}

function dynamicDifficultyRules(locale: Locale, latestLevel?: number): string {
  const base = latestLevel ?? 3;
  return safeJoin([
    pick(
      locale === "ar",
      "\n\nالتكيُّف مع الصعوبة:",
      "\n\nDynamic difficulty:",
    ),
    pick(
      locale === "ar",
      `- ابدأ من مستوى L${base} تقريبيًا وتحرك تدريجيًا لأعلى/أسفل بحسب إجابات المستخدم وثقته الظاهرة.`,
      `- Start roughly at level L${base} and move gradually up/down based on the user's demonstrated answers and confidence.`,
    ),
    pick(
      locale === "ar",
      "- استخدم أسئلة استكشافية قبل رفع الصعوبة. لا تقفز بين المستويات بسرعة.",
      "- Use probing questions before increasing difficulty. Avoid large jumps across levels.",
    ),
    pick(
      locale === "ar",
      "- إذا تعثّر المستخدم، بسِّط السؤال وقدِّم تلميحًا قصيرًا.",
      "- If the user struggles, simplify the question and offer a brief hint.",
    ),
  ]);
}

export async function buildSystemPrompt(
  input: BuildPromptInput,
): Promise<BuildPromptOutput> {
  const { aiSkillId, locale, convexToken } = input;

  let skillNameEn: string | undefined;
  let skillNameAr: string | undefined;
  let definitionEn: string | undefined;
  let definitionAr: string | undefined;
  let levels: ReadonlyArray<SummaryLevel> = [];
  let latestLevel: number | undefined;
  let latestConfidence: number | undefined;

  // Try Convex: get rich context (aiSkill + latestAssessment + activeLearningPath)
  try {
    if (convexToken) {
      const res = await fetchMutation(
        api.aiAssessments.startAssessment,
        { aiSkillId: aiSkillId as unknown as Id<"aiSkills"> },
        { token: convexToken },
      );
      const typed = res as unknown as StartAssessmentResult;
      if (typed.aiSkill) {
        skillNameEn = typed.aiSkill.nameEn;
        skillNameAr = typed.aiSkill.nameAr;
        definitionEn = typed.aiSkill.definitionEn;
        definitionAr = typed.aiSkill.definitionAr;
        levels = normalizeLevels(typed.aiSkill.levels);
      }
      if (typed.latestAssessment) {
        latestLevel = typed.latestAssessment.level;
        latestConfidence = typed.latestAssessment.confidence;
      }
    }
  } catch (err) {
    Sentry.captureException(err);
  }

  // Enrich or fallback using local data file
  const local = findLocalSkillByNames(skillNameEn, skillNameAr);
  const localLevels: readonly LocalLevel[] = local?.levels ?? [];
  if (levels.length === 0 && localLevels.length > 0) {
    levels = localLevels.map((l) => ({
      level: l.level,
      nameEn: l.nameEn,
      nameAr: l.nameAr,
      descriptionEn: l.descriptionEn,
      descriptionAr: l.descriptionAr,
    }));
  }
  if (!definitionEn && local?.definitionEn) definitionEn = local.definitionEn;
  if (!definitionAr && local?.definitionAr) definitionAr = local.definitionAr;

  // Compose prompt
  const header = pick(
    locale === "ar",
    "أنت مساعد يقيم مهارة المستخدم ويقترح مسار تعلم مناسب.",
    "You assess the user's skill and propose an appropriate learning path.",
  );

  const nameLine = pick(
    locale === "ar",
    skillNameAr ? `المهارة: ${skillNameAr}` : undefined,
    skillNameEn ? `Skill: ${skillNameEn}` : undefined,
  );

  const defLine = pick(
    locale === "ar",
    definitionAr ? `التعريف: ${definitionAr}` : undefined,
    definitionEn ? `Definition: ${definitionEn}` : undefined,
  );

  const lvlSummary =
    levels.length > 0 ? levelsSummary(locale, levels) : undefined;

  const userContext =
    latestLevel !== undefined && latestConfidence !== undefined
      ? pick(
          locale === "ar",
          `السياق السابق: آخر تقييم مستوى ${latestLevel} بثقة ${latestConfidence}.`,
          `Previous context: latest assessment level ${latestLevel} with confidence ${latestConfidence}.`,
        )
      : undefined;

  const constraints = moduleConstraints(locale);
  const schema = schemaInstruction(locale);
  const templates = levelTemplatesSection(locale, localLevels, latestLevel);
  const tone = bilingualToneRules(locale);
  const turns = turnTakingRules(locale);
  const adapt = dynamicDifficultyRules(locale, latestLevel);

  return Sentry.startSpan(
    { op: "ai.prompt", name: "buildSystemPrompt" },
    async (span) => {
      span?.setAttribute?.("locale", locale);
      if (latestLevel !== undefined)
        span?.setAttribute?.("latestLevel", latestLevel);
      const systemPrompt = safeJoin([
        header,
        nameLine,
        defLine,
        lvlSummary,
        userContext,
        tone,
        turns,
        adapt,
        templates,
        constraints,
        schema,
      ]);
      return { systemPrompt } as const;
    },
  );
}
