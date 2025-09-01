import { fetchMutation } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  ALLOWED_MODULE_TYPES,
  MIN_MODULES,
  MAX_MODULES,
} from "@/shared/ai/constants";
import * as Sentry from "@sentry/nextjs";

// Simple in-memory cache for skill definitions and templates
const skillCache = new Map<
  string,
  {
    skill: LocalSkill;
    timestamp: number;
  }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedSkill(skillId: string): LocalSkill | null {
  const cached = skillCache.get(skillId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.skill;
  }
  return null;
}

function setCachedSkill(skillId: string, skill: LocalSkill): void {
  skillCache.set(skillId, {
    skill,
    timestamp: Date.now(),
  });
}

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

function findLocalSkillByNames(
  nameEn?: string | null,
  nameAr?: string | null,
): LocalSkill | undefined {
  if (!nameEn && !nameAr) return undefined;

  // Create cache key from skill names
  const cacheKey = `${nameEn ?? ""}_${nameAr ?? ""}`;

  // Check cache first
  const cached = getCachedSkill(cacheKey);
  if (cached) return cached;

  // Find skill and cache result
  const skill = localSkills.find((s) => {
    const nEn = s.nameEn?.toLowerCase();
    const nAr = s.nameAr?.toLowerCase();
    const enMatch = nameEn != null && nEn === nameEn.toLowerCase();
    const arMatch = nameAr != null && nAr === nameAr.toLowerCase();
    return enMatch || arMatch;
  });

  if (skill) {
    setCachedSkill(cacheKey, skill);
  }

  return skill;
}

function levelsSummary(
  locale: Locale,
  levels: ReadonlyArray<{
    level: number;
    nameEn: string;
    nameAr: string;
    descriptionEn?: string;
    descriptionAr?: string;
    resources?: ReadonlyArray<{ url: string; title?: string }>;
  }>,
): string {
  const lines: string[] = [];
  lines.push("Skill Levels:");
  for (const lvl of levels) {
    lines.push(
      `- L${lvl.level}: ${lvl.nameEn}${lvl.descriptionEn ? ` — ${lvl.descriptionEn}` : ""}`,
    );
  }
  return lines.join("\n");
}

function moduleConstraints(_locale: Locale): string {
  const types = Array.from(ALLOWED_MODULE_TYPES).join(" | ");
  return safeJoin([
    "Learning Path constraints:",
    `- Use between ${MIN_MODULES} and ${MAX_MODULES} learning modules.`,
    `- Allowed types: ${types}.`,
    "- Duration must be human-readable (e.g., 10 minutes, 1 hour).",
    "- For video modules: Use ONLY real YouTube URLs from the skill level resources or provide search keywords like 'YouTube: Python basics tutorial'",
    "- For article modules: Use ONLY real URLs from the skill level resources or provide search keywords like 'Google: JavaScript fundamentals guide'",
    "- NEVER generate fake or placeholder URLs. Always use real resources from the skill data or search instructions.",
    "- Check the skill level resources for existing URLs that match the user's assessed level.",
  ]);
}

// Removed verbose example conversation to reduce prompt size

// Removed verbose JSON example to reduce prompt size

function schemaInstruction(_locale: Locale): string {
  return safeJoin([
    "\n\nOutput Instructions:",
    "At the end, output exactly one valid JSON block inside a ```json fenced code block with no prose before or after, matching this schema:",
    "{",
    "  skill?: string,",
    "  level: number (1-10),",
    "  confidence: number (0-1),",
    "  reasoning?: string,",
    "  learningModules: Array<",
    "    { id: string, title: string, type: 'article'|'video'|'quiz'|'project', duration: string }",
    "  > with length between 3 and 6",
    "}",
    "Do not include extra keys or comments. Ensure the block ends with ``` and no trailing text after the JSON.",
  ]);
}

function bilingualToneRules(locale: Locale): string {
  return locale === "ar"
    ? "\n\nالنبرة: ودود ومهني ومشجِّع. جمل قصيرة وواضحة. اطرح أسئلة محددة وعملية من مستويات المهارة."
    : "\n\nTone: Friendly, professional, encouraging. Short, clear sentences. Ask specific, practical questions from the skill levels.";
}

function turnTakingRules(locale: Locale): string {
  if (locale === "ar") {
    return '\n\nقواعد المحادثة:\n• اطرح سؤالاً واحداً فقط في كل مرة\n• انتظر إجابة المستخدم قبل السؤال التالي\n• أقصى 5 أسئلة بدقة - لا تتجاوز هذا الحد أبداً\n• اعرض رقم السؤال: "السؤال X من 5" قبل كل سؤال\n• بعد السؤال الخامس، قدم التقييم النهائي فوراً\n• لا تكرر أي سؤال - كل سؤال يجب أن يكون مختلفاً\n• تتبع الأسئلة المطروحة لتجنب التكرار\n• استخدم أسئلة اختيار من متعدد فقط';
  }
  return "\n\nRules: One question at a time. MAXIMUM 5 questions STRICTLY - NEVER exceed this limit.\nCount questions and end assessment at question 5.\nNEVER repeat questions - each must be unique.\nTrack asked questions to avoid duplicates.\nUse ONLY multiple choice questions.";
}

function multipleChoiceRules(locale: Locale, _latestLevel?: number): string {
  const rules =
    locale === "ar"
      ? [
          "• استخدم نظام 10 مستويات كاملاً (1-10) لتقييم المهارة",
          "• ابدأ بأسئلة متوسطة (مستوى 5) ثم اضبط حسب الإجابات",
          "• إذا أجاب بشكل صحيح، انتقل لمستوى أعلى",
          "• إذا أجاب بشكل خاطئ أو غير مكتمل، انتقل لمستوى أقل",
          "• اهدف للوصول لمستوى دقيق خلال 5 أسئلة كحد أقصى",
          "• اطرح أسئلة اختيار من متعدد فقط مع 4 خيارات (أ، ب، ج، د)",
          "• اقبل الإجابات بالأحرف العربية (أ، ب، ج، د) أو الإنجليزية (A، B، C، D)",
          "• كن مرناً مع الأخطاء الإملائية والنحوية البسيطة في الإجابات",
          "• لا تطرح أسئلة مفتوحة أو أسئلة تتطلب إجابات طويلة",
          "• تأكد من أن كل سؤال له إجابة واحدة صحيحة واضحة",
        ]
      : [
          "• Use full 10-level system (1-10) to assess the skill",
          "• Start with medium questions (level 5) then adjust based on responses",
          "• If answered correctly, move to higher level",
          "• If answered incorrectly or incompletely, move to lower level",
          "• Aim to reach accurate level within maximum 5 questions",
          "• Ask ONLY multiple choice questions with 4 options (A, B, C, D)",
          "• Accept answers in both Arabic letters (أ، ب، ج، د) and English letters (A، B، C، D)",
          "• Be flexible with minor spelling and grammar errors in responses",
          "• Do NOT ask open-ended questions or questions requiring long answers",
          "• Ensure each question has one clear correct answer",
        ];

  return rules.map((rule) => `${rule}\n`).join("");
}

function dynamicDifficultyRules(locale: Locale, _latestLevel?: number): string {
  const rules =
    locale === "ar"
      ? [
          "• استخدم نظام 10 مستويات كاملاً (1-10) لتقييم المهارة",
          "• ابدأ بأسئلة متوسطة (مستوى 5) ثم اضبط حسب الإجابات",
          "• إذا أجاب بشكل صحيح، انتقل لمستوى أعلى",
          "• إذا أجاب بشكل خاطئ أو غير مكتمل، انتقل لمستوى أقل",
          "• اهدف للوصول لمستوى دقيق خلال 5 أسئلة كحد أقصى",
        ]
      : [
          "• Use full 10-level system (1-10) to assess the skill",
          "• Start with medium questions (level 5) then adjust based on responses",
          "• If answered correctly, move to higher level",
          "• If answered incorrectly or incompletely, move to lower level",
          "• Aim to reach accurate level within maximum 5 questions",
        ];

  return rules.map((rule) => `${rule}\n`).join("");
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
  let youthFirstName: string | undefined;

  // Try Convex: get rich context with optimized single call
  try {
    // Avoid Convex calls in test environment to keep unit/integration tests deterministic
    const allowConvex = !!convexToken && process.env.NODE_ENV !== "test";
    if (allowConvex) {
      const res = await fetchMutation(
        api.aiAssessments.startAssessmentWithProfile,
        {
          aiSkillId: aiSkillId as unknown as Id<"aiSkills">,
          locale,
        },
        { token: convexToken },
      );
      const typed = res as unknown as StartAssessmentResult & {
        user?: { firstName?: string };
      };
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
      // Extract first name from optimized response
      if (typed.user?.firstName) {
        youthFirstName = typed.user.firstName.trim();
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

  // Include skill resources for URL validation
  const skillResources =
    levels.length > 0
      ? `\n\nSkill Level Resources:\n${levels
          .map(
            (l) =>
              `Level ${l.level}: ${l.descriptionEn ?? l.descriptionAr}\n${
                local?.levels
                  ?.find((ll) => ll.level === l.level)
                  ?.resources?.map((r) => `- ${r.url}`)
                  .join("\n") ?? ""
              }`,
          )
          .join("\n\n")}`
      : "";

  // Compose prompt - ALL IN ENGLISH
  const header =
    "You are an AI assessment assistant that evaluates the user's skill level and proposes an appropriate learning path.";

  const nameLine = skillNameEn ? `Skill: ${skillNameEn}` : undefined;

  const defLine = definitionEn ? `Definition: ${definitionEn}` : undefined;

  const lvlSummary =
    levels.length > 0 ? levelsSummary(locale, levels) : undefined;

  const userContext =
    latestLevel !== undefined && latestConfidence !== undefined
      ? `Previous context: latest assessment level ${latestLevel} with confidence ${latestConfidence}.`
      : undefined;

  const constraints = moduleConstraints(locale);
  const schema = schemaInstruction(locale);
  // Remove unused variable
  // const moduleTemplatesByLevel = ModuleTemplates.filter(
  //   (t: any) => t.level === latestLevel ?? t.level === 0,
  // );
  const tone = bilingualToneRules(locale);
  const turns = turnTakingRules(locale);
  const mcq = multipleChoiceRules(locale, latestLevel);
  const adapt = dynamicDifficultyRules(locale, latestLevel);

  // Simplified language policy
  const languagePolicy = `\n\nLanguage: Always respond in ${locale === "ar" ? "Arabic" : "English"}. Do not switch languages.`;

  // Dynamic greeting messages for variety
  const greetings =
    locale === "ar"
      ? [
          `مرحباً${youthFirstName ? ` ${youthFirstName}` : ""}! أنا مساعدك الذكي لتقييم المهارات.`,
          `أهلاً وسهلاً${youthFirstName ? ` ${youthFirstName}` : ""}! سأساعدك في اكتشاف مستوى مهاراتك.`,
          `مرحباً بك${youthFirstName ? ` ${youthFirstName}` : ""}! دعني أقيم مهاراتك لأقترح عليك أفضل مسار تعلم.`,
          `السلام عليكم${youthFirstName ? ` ${youthFirstName}` : ""}! سأطرح عليك 5 أسئلة سريعة لتحديد مستواك.`,
        ]
      : [
          `Hello${youthFirstName ? ` ${youthFirstName}` : ""}! I'm your AI skills assessment assistant.`,
          `Welcome${youthFirstName ? ` ${youthFirstName}` : ""}! I'll help you discover your skill level.`,
          `Hi there${youthFirstName ? ` ${youthFirstName}` : ""}! Let me assess your skills to suggest the best learning path.`,
          `Greetings${youthFirstName ? ` ${youthFirstName}` : ""}! I'll ask you 5 quick questions to determine your level.`,
        ];

  const randomGreeting =
    greetings[Math.floor(Math.random() * greetings.length)];
  const firstTurnRule = `\n\nStart: If input is '__start__', use this greeting: "${randomGreeting} سأطرح عليك 5 أسئلة اختيار من متعدد لتحديد مستواك وإنشاء مسار تعلم مخصص لك. هل أنت مستعد للبدء؟" (Arabic) or "${randomGreeting} I'll ask you 5 multiple choice questions to determine your level and create a personalized learning path. Are you ready to begin?" (English). Otherwise, start assessment directly. CRITICAL: Always show "Question X/5" before each question and STOP after question 5.`;

  // Enhanced assessment flow rules
  const assessmentFlow =
    locale === "ar"
      ? '\n\nتدفق التقييم الإجباري:\n• السؤال 1-5: اطرح أسئلة اختيار من متعدد فقط\n• بعد السؤال 5: قدم التقييم النهائي مع JSON فوراً\n• لا تطلب المزيد من الأسئلة أو التوضيحات\n• كل سؤال يجب أن يكون مختلفاً تماماً\n• استخدم تنسيق: "السؤال X من 5" ثم السؤال مع 4 خيارات (أ، ب، ج، د)\n• اقبل الإجابات بالأحرف العربية (أ، ب، ج، د) أو الإنجليزية (A، B، C، D)\n• تفهم الأخطاء الإملائية والنحوية البسيطة وفسر الإجابة بناءً على المعنى المقصود'
      : '\n\nMandatory Assessment Flow:\n• Questions 1-5: Ask ONLY multiple choice questions\n• After Question 5: Provide final assessment with JSON immediately\n• Do NOT ask for more questions or clarifications\n• Each question must be completely different\n• Use format: "Question X/5" then question with 4 options (A, B, C, D)\n• Accept answers in both Arabic letters (أ، ب، ج، د) and English letters (A، B، C، D)\n• Understand minor spelling and grammar errors and interpret the answer based on intended meaning';

  // Simplified Sawaed context
  const sawaedFocus =
    "\n\nSawaed: Youth skill development platform. If asked, answer briefly and return to assessment.";

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
        firstTurnRule,
        tone,
        turns,
        mcq,
        adapt,
        // templates removed - unused variable
        constraints,
        skillResources,
        schema,
        languagePolicy,
        sawaedFocus,
        assessmentFlow,
      ]);
      return { systemPrompt } as const;
    },
  );
}
