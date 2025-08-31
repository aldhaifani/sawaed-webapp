import { fetchMutation } from "convex/nextjs";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";
import {
  ALLOWED_MODULE_TYPES,
  MIN_MODULES,
  MAX_MODULES,
} from "@/shared/ai/constants";
import * as Sentry from "@sentry/nextjs";
import { ModuleTemplates } from "@/shared/ai/module-templates";

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

// removed: legacy per-level templates section (replaced by conciseModuleTemplatesSection)

function safeJoin(lines: readonly (string | undefined | null)[]): string {
  return lines.filter(Boolean).join("\n");
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function conciseModuleTemplatesSection(
  locale: Locale,
  params: { baseLevel?: number; skillNameEn?: string; skillNameAr?: string },
): string {
  const header =
    locale === "ar" ? "قوالب الوحدات (مختصر):" : "Module Templates (concise):";
  const version = ModuleTemplates.getVersion();
  const skillToken = locale === "ar" ? params.skillNameAr : params.skillNameEn;
  const base = clamp(params.baseLevel ?? 3, 1, 5);
  const levelsToShow = [clamp(base - 1, 1, 5), base, clamp(base + 1, 1, 5)];
  const seen = new Set<number>();
  const lines: string[] = [`${header} v${version}`];
  for (const lvl of levelsToShow) {
    if (seen.has(lvl)) continue;
    seen.add(lvl);
    for (const type of ["article", "video", "quiz", "project"] as const) {
      const line = ModuleTemplates.toConciseInstruction({
        level: lvl,
        type,
        locale,
        skillToken,
      });
      lines.push(`- ${line}`);
    }
  }
  return lines.join("\n");
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

function exampleConversationSection(
  locale: Locale,
  params: { skillNameEn?: string; skillNameAr?: string; latestLevel?: number },
): string {
  const header = pick(
    locale === "ar",
    "\n\nمثال محادثة (إرشادي):",
    "\n\nExample conversation (illustrative):",
  );
  const skill =
    pick(locale === "ar", params.skillNameAr, params.skillNameEn) ??
    pick(locale === "ar", "المهارة", "the skill");
  const base = clamp(params.latestLevel ?? 3, 1, 5);
  const nextUp = clamp(base + 1, 1, 5);
  const nextDown = clamp(base - 1, 1, 5);

  const lines: string[] = [header];
  if (locale === "ar") {
    lines.push(
      `AI: مرحبًا! سنقيّم مستوى معرفتك في ${skill}. إليك سؤال متعدد الخيارات:`,
      `AI: [L${base}] عندما تواجه مشكلة جديدة، أي نهج تتبعه أولًا؟`,
      "A) أبحث عن مثال مشابه وأطبقه كما هو",
      "B) أقسّم المشكلة إلى أجزاء صغيرة وأحل كل جزء",
      "C) أكتب كودًا سريعًا ثم أصلح الأخطاء لاحقًا",
      "D) أطلب الحل مباشرة من صديق",
      "Other: اكتب إجابتك",
      "User: B",
      "AI: جيد! يبدو أنك تستخدم أسلوبًا منظمًا. دعنا نجرب سؤالًا أصعب قليلًا:",
      `AI: [L${nextUp}] إذا تعارضت حلّان محتملان، كيف تختار بينهما في سياق ${skill}؟`,
    );
  } else {
    lines.push(
      `AI: Hi! We'll assess your proficiency in ${skill}. Here's a multiple-choice question:`,
      `AI: [L${base}] When you face a new problem, what's your first approach?`,
      "A) Look for a similar example and copy it",
      "B) Break it into smaller parts and solve step by step",
      "C) Hack a quick solution and fix later",
      "D) Ask a friend for the answer",
      "Other: write your own",
      "User: B",
      "AI: Nice! That shows structured thinking. Let's try something slightly harder:",
      `AI: [L${nextUp}] If two potential solutions conflict, how do you decide between them in the context of ${skill}?`,
    );
  }
  // Also show a downshift example cue
  lines.push(
    pick(
      locale === "ar",
      `AI: إذا كان ذلك صعبًا، يمكننا تبسيطه: [L${nextDown}] ما أفضل طريقة لبدء الفهم؟`,
      `AI: If that's challenging, we can simplify: [L${nextDown}] What's the best way to start understanding?`,
    ),
  );
  return lines.join("\n");
}

function exampleJsonSection(locale: Locale): string {
  const header = pick(
    locale === "ar",
    "\n\nمثال JSON (للتوضيح فقط، لا تخرجه الآن):",
    "\n\nExample JSON (illustrative only, do NOT output now):",
  );
  // Use tildes for fencing to avoid backticks inside template literals and avoid colliding with the final ```json instruction
  const bodyEn = `\n~~~javascript\n{\n  skill: "Critical Thinking",\n  level: 3,\n  confidence: 0.74,\n  reasoning: "Shows structured problem decomposition with occasional guidance.",\n  learningModules: [\n    { id: "L3-ART-1", title: "Analyze assumptions in short case studies", type: "article", duration: "15 minutes" },\n    { id: "L3-VID-1", title: "Weighing trade-offs: a quick walkthrough", type: "video", duration: "10 minutes" },\n    { id: "L3-QUIZ-1", title: "Identify logical fallacies (basic)", type: "quiz", duration: "10 minutes" }\n  ]\n}\n~~~\n`;
  const bodyAr = `\n~~~javascript\n{\n  skill: "التفكير النقدي",\n  level: 3,\n  confidence: 0.74,\n  reasoning: "يُظهر تفكيكًا منظمًا للمشكلة مع حاجة لإرشاد بسيط.",\n  learningModules: [\n    { id: "L3-ART-1", title: "تحليل الافتراضات في دراسات حالة قصيرة", type: "article", duration: "15 دقيقة" },\n    { id: "L3-VID-1", title: "موازنة المفاضلات: شرح سريع", type: "video", duration: "10 دقائق" },\n    { id: "L3-QUIZ-1", title: "التعرّف على المغالطات المنطقية (أساسي)", type: "quiz", duration: "10 دقائق" }\n  ]\n}\n~~~\n`;
  return header + (locale === "ar" ? bodyAr : bodyEn);
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

function multipleChoiceRules(locale: Locale): string {
  return safeJoin([
    pick(
      locale === "ar",
      "\n\nصيغة الأسئلة متعددة الخيارات:",
      "\n\nMultiple-choice format:",
    ),
    pick(
      locale === "ar",
      "- في كل دور، اطرح سؤال تقييم واحد فقط مع 5 خيارات: (A)، (B)، (C)، (D)، و(Other: اكتب إجابتك).",
      "- Each turn, ask exactly one assessment question with 5 options: (A), (B), (C), (D), and (Other: write your own).",
    ),
    pick(
      locale === "ar",
      "- اجعل الخيارات الأربعة واضحة ومتميزة، واسمح للمستخدم بكتابة إجابة حرة إذا اختار (Other).",
      "- Make the four options clear and distinct; allow the user to write a free-form answer if they choose (Other).",
    ),
    pick(
      locale === "ar",
      "- بعد اختيار المستخدم أو كتابة إجابة، قدّم تغذية راجعة قصيرة ثم انتقل للسؤال التالي أو قم بالتكييف في الصعوبة.",
      "- After the user selects or writes an answer, give brief feedback, then proceed to the next question or adapt difficulty.",
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
  const templates = conciseModuleTemplatesSection(locale, {
    baseLevel: latestLevel,
    skillNameEn,
    skillNameAr,
  });
  const tone = bilingualToneRules(locale);
  const turns = turnTakingRules(locale);
  const mcq = multipleChoiceRules(locale);
  const adapt = dynamicDifficultyRules(locale, latestLevel);
  const examples = exampleConversationSection(locale, {
    skillNameEn,
    skillNameAr,
    latestLevel,
  });
  const exampleJson = exampleJsonSection(locale);

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
        mcq,
        adapt,
        examples,
        templates,
        constraints,
        exampleJson,
        schema,
      ]);
      return { systemPrompt } as const;
    },
  );
}
