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
  readonly allowedUrls: readonly string[];
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

function moduleConstraints(locale: Locale): string {
  const types = Array.from(ALLOWED_MODULE_TYPES).join(" | ");
  const searchPhraseRules =
    locale === "ar"
      ? [
          "- عبارات البحث: يجب أن تكون عبارات مفيدة باللغة العربية فقط (3-6 كلمات لكل عبارة)",
          "- مثال صحيح: ['تعلم أساسيات البرمجة', 'دورة تطوير المواقع', 'شرح قواعد البيانات']",
          "- مثال خاطئ: ['programming', 'beginner', 'video', 'tutorial', 'learning', 'article']",
          "- ممنوع تماماً: أي كلمات إنجليزية أو كلمات مفردة عامة",
          "- ممنوع استخدام: 'مشروع', 'مبتدئ', 'فيديو', 'مقال', 'تعلم', 'درس', 'دورة'",
          "- كل عبارة يجب أن تكون وصفية ومحددة للموضوع بدقة",
          "- استخدم مصطلحات تقنية محددة فقط",
        ]
      : [
          "- Search phrases: Must be meaningful English phrases only (3-6 words per phrase)",
          "- Correct example: ['learn programming basics', 'web development course', 'database fundamentals tutorial']",
          "- Wrong example: ['programming', 'beginner', 'video', 'tutorial', 'learning', 'article']",
          "- STRICTLY FORBIDDEN: Any single generic words or Arabic words",
          "- NEVER use: 'project', 'beginner', 'video', 'article', 'learning', 'lesson', 'course'",
          "- Each phrase must be descriptive and topic-specific with technical precision",
          "- Use specific technical terminology only",
        ];

  return safeJoin([
    "Learning Path constraints:",
    `- Use between ${MIN_MODULES} and ${MAX_MODULES} learning modules.`,
    `- Allowed types: ${types}.`,
    "- Duration must be human-readable (e.g., 10 minutes, 1 hour).",
    "- For video modules: Use ONLY real YouTube URLs from the skill level resources or provide search phrases",
    "- For article modules: Use ONLY real URLs from the skill level resources or provide search phrases",
    "- NEVER generate fake or placeholder URLs. Always use real resources from the skill data or search instructions.",
    "- Check the skill level resources for existing URLs that match the user's assessed level.",
    ...searchPhraseRules,
  ]);
}

// Removed verbose example conversation to reduce prompt size

// Removed verbose JSON example to reduce prompt size

function schemaInstruction(locale: Locale): string {
  const searchPhraseExample =
    locale === "ar"
      ? "['تعلم أساسيات البرمجة', 'دورة تطوير المواقع المتقدمة', 'شرح قواعد البيانات للمبتدئين']"
      : "['learn programming fundamentals', 'advanced web development course', 'database design for beginners']";

  const searchPhraseRules =
    locale === "ar"
      ? "قواعد عبارات البحث: استخدم فقط الروابط الحقيقية المدرجة في موارد إرشادات المستوى عند إضافة resourceUrl. إذا لم يتطابق أي مورد بدقة، احذف resourceUrl وقدم 3-5 عبارات بحث مركزة باللغة العربية فقط."
      : "Search phrase rules: Use ONLY real URLs listed under Level Guidance resources when adding resourceUrl. If no exact resource fits, omit resourceUrl and provide 3-5 focused search phrases in the chat language only.";

  return safeJoin([
    "\n\nOutput Instructions:",
    "At the end, output exactly one valid JSON block inside a ```json fenced code block with no prose before or after, matching this schema:",
    "{",
    "  skill?: string,",
    "  level: number (1-10),",
    "  confidence: number (0-1),",
    "  reasoning?: string,",
    "  learningModules: Array<",
    "    {",
    "      id: string,",
    "      title: string,",
    "      type: 'article'|'video'|'quiz'|'project',",
    "      duration: string,",
    "      description?: string,",
    "      objectives?: string[],",
    "      outline?: string[],",
    "      resourceUrl?: string,",
    "      resourceTitle?: string,",
    "      searchKeywords?: string[],",
    "      levelRef?: number,",
    "      difficulty?: 'beginner'|'intermediate'|'advanced'",
    "    }",
    "  > with length between 3 and 6",
    "}",
    `${searchPhraseRules} Example: ${searchPhraseExample}`,
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

  // Concise Level Guidance for the assessed level ±1 (if available)
  function buildLevelGuidance(
    loc: LocalSkill | undefined,
    lvls: ReadonlyArray<SummaryLevel>,
    assessed?: number,
  ): string {
    if (!loc || lvls.length === 0) return "";
    const all = loc.levels;
    const indices: number[] = [];
    if (assessed && Number.isFinite(assessed)) {
      const targetIdx = all.findIndex((x) => x.level === assessed);
      if (targetIdx >= 0) {
        indices.push(targetIdx);
        if (targetIdx - 1 >= 0) indices.push(targetIdx - 1);
        if (targetIdx + 1 < all.length) indices.push(targetIdx + 1);
      }
    }
    const uniq = Array.from(new Set(indices));
    if (uniq.length === 0) {
      // Fallback: first up to 2 levels to keep prompt compact
      uniq.push(0);
      if (all.length > 1) uniq.push(1);
    }
    const lines: string[] = ["Level Guidance (use these to craft modules):"];
    for (const i of uniq) {
      const L = all[i];
      if (!L) continue;
      const header = `- L${L.level}: ${L.nameEn}${L.descriptionEn ? ` — ${L.descriptionEn}` : ""}`;
      const steps = (L.progressionSteps ?? [])
        .slice(0, 6)
        .map((s) => `  • ${s}`)
        .join("\n");
      const urls = (L.resources ?? [])
        .slice(0, 6)
        .map((r) => `  • ${r.url}`)
        .join("\n");
      lines.push(header);
      if (steps) lines.push("  Steps:\n" + steps);
      if (urls) lines.push("  Resources:\n" + urls);
    }
    return lines.join("\n");
  }
  const levelGuidance = buildLevelGuidance(local, levels, latestLevel);

  // Compute URL allowlist from Level Guidance levels
  function collectAllowedUrls(
    loc: LocalSkill | undefined,
    lvls: ReadonlyArray<SummaryLevel>,
    assessed?: number,
  ): readonly string[] {
    if (!loc || lvls.length === 0) return [];
    const all = loc.levels;
    const indices: number[] = [];
    if (assessed && Number.isFinite(assessed)) {
      const targetIdx = all.findIndex((x) => x.level === assessed);
      if (targetIdx >= 0) {
        indices.push(targetIdx);
        if (targetIdx - 1 >= 0) indices.push(targetIdx - 1);
        if (targetIdx + 1 < all.length) indices.push(targetIdx + 1);
      }
    }
    const uniq = Array.from(new Set(indices));
    if (uniq.length === 0) {
      uniq.push(0);
      if (all.length > 1) uniq.push(1);
    }
    const out = new Set<string>();
    for (const i of uniq) {
      const L = all[i];
      if (!L) continue;
      for (const r of L.resources ?? []) {
        if (r?.url && typeof r.url === "string") out.add(r.url);
      }
    }
    return Array.from(out);
  }
  const allowedUrls = collectAllowedUrls(local, levels, latestLevel);

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

  // Enhanced language policy with content consistency enforcement
  const languagePolicy =
    locale === "ar"
      ? `\n\nسياسة اللغة الصارمة:\n• يجب أن تكون جميع المحتويات باللغة العربية حصرياً\n• العناوين والأوصاف والأهداف والمخططات: عربية فقط\n• عبارات البحث: عربية فقط (لا تخلط مع الإنجليزية)\n• لا تستخدم كلمات إنجليزية مثل 'Core concepts' أو 'Practice exercises'\n• استخدم مصطلحات عربية مناسبة للمحتوى التقني\n• مثال صحيح للمخطط: ['مقدمة في الموضوع', 'المفاهيم الأساسية', 'تمارين تطبيقية']`
      : `\n\nStrict Language Policy:\n• ALL content must be in English exclusively\n• Titles, descriptions, objectives, outlines: English only\n• Search phrases: English only (no mixing with Arabic)\n• Do NOT use Arabic words or mixed language content\n• Use appropriate English technical terminology\n• Correct outline example: ['Introduction to topic', 'Core concepts', 'Practice exercises']`;

  // Dynamic greeting messages with language consistency
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
  // Locale-specific start rule with language consistency enforcement
  const firstTurnRule =
    locale === "ar"
      ? `\n\nبدء المحادثة: إذا كانت رسالة الإدخال '__start__' فاستخدم التحية التالية مرة واحدة فقط باللغة العربية: "${randomGreeting} سأطرح عليك 5 أسئلة اختيارية لتحديد مستواك وإنشاء مسار تعلم مخصص لك باللغة العربية. هل أنت مستعد للبدء؟". خلاف ذلك لا تستخدم أي تحية - ابدأ مباشرة بالسؤال التالي باللغة العربية فقط. مهم: لا تحيي المستخدم في كل سؤال - التحية فقط عند '__start__'.`
      : `\n\nStart: If the input is '__start__', use this greeting ONCE in English: "${randomGreeting} I'll ask you 5 multiple choice questions to determine your level and create a personalized learning path in English. Are you ready to begin?". Otherwise, do NOT greet - start directly with the next question in English only. IMPORTANT: Do NOT greet the user on every question - greeting is ONLY for '__start__'.`;

  // Enhanced assessment flow rules with language consistency
  const assessmentFlow =
    locale === "ar"
      ? '\n\nتدفق التقييم (صارم):\n• اطرح فقط أسئلة اختيار من متعدد (4 خيارات) باللغة العربية\n• الحد الأقصى 5 أسئلة\n• يُسمح بالإنهاء المبكر إذا كنت واثقًا (بعد 3 أسئلة على الأقل)\n• عند إصدار التقييم النهائي مع JSON: توقف فورًا ولا ترسل أي أسئلة أخرى\n• لا تطلب أسئلة أو توضيحات إضافية بعد الإنهاء\n• كل سؤال مختلف تمامًا وباللغة العربية فقط\n• استخدم التنسيق: "السؤال X من 5" ثم السؤال مع الخيارات (أ، ب، ج، د)\n• اقبل الإجابات بالأحرف العربية (أ، ب، ج، د) أو الإنجليزية (A, B, C, D)\n• لا تكرر الإجابات - كل حرف يجب أن يُستخدم مرة واحدة فقط\n• إذا أجاب المستخدم بحرف واحد، لا تطلب توضيحًا - تابع للسؤال التالي باللغة العربية\n• مهم: جميع محتويات مسار التعلم يجب أن تكون باللغة العربية (العناوين، الأوصاف، الأهداف، المخططات، عبارات البحث)'
      : '\n\nAssessment Flow (strict):\n• Ask ONLY multiple-choice questions (4 options) in English\n• Maximum of 5 questions\n• Early completion is allowed when confident (after at least 3 questions)\n• When you output the final assessment with JSON: STOP immediately and do not ask any further questions\n• Do NOT ask for additional questions or clarifications after completion\n• Each question must be entirely different and in English only\n• Use the format: "Question X/5" then the question with options (A, B, C, D)\n• Accept answers in Arabic letters (أ، ب، ج، د) or English letters (A, B, C, D)\n• Do NOT repeat answers - each letter should be used only once\n• If user answers with a single letter, do NOT ask for clarification - proceed to next question in English\n• IMPORTANT: All learning path content must be in English (titles, descriptions, objectives, outlines, search phrases)';

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
        languagePolicy,
        firstTurnRule,
        tone,
        turns,
        mcq,
        adapt,
        constraints,
        skillResources,
        levelGuidance,
        schema,
        sawaedFocus,
        assessmentFlow,
      ]);
      return { systemPrompt, allowedUrls } as const;
    },
  );
}
