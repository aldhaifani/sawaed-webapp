import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const SendRequestSchema = z.object({
  skillId: z.string().min(1),
  message: z.string().min(1),
});
import {
  appendPartial,
  createSession,
  setDone,
  setError,
  setRunning,
  getSession,
  setAssessmentPersisted,
} from "../_store";
import { cleanupStaleSessions } from "../_store";
import { checkRateLimit, getClientIp } from "../_rateLimit";
import { generateOnce, generateWithStreaming } from "@/lib/gemini";
import { retryAsync } from "@/lib/retry";

// Helper to reduce duplication in AI generation calls
async function generateWithRetry(
  model: string,
  apiKey: string,
  contents: ReadonlyArray<{
    readonly role?: "user" | "model" | "system";
    readonly parts: ReadonlyArray<{ readonly text: string }>;
  }>,
  systemInstruction: {
    readonly role?: "user" | "model" | "system";
    readonly parts: ReadonlyArray<{ readonly text: string }>;
  },
  attempts: number,
  label: string,
): Promise<string> {
  return Sentry.startSpan(
    {
      op: "ai.generation",
      name: `Generate AI Response - ${label}`,
      attributes: {
        "ai.model": model,
        "ai.temperature": 0.3,
        "ai.max_tokens": 1000,
        "ai.attempts": attempts,
      },
    },
    async (span) => {
      const startTime = Date.now();

      try {
        const result = await retryAsync(
          () =>
            generateOnce({
              model,
              apiKey,
              contents,
              systemInstruction,
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 8000,
                topP: 0.8,
              },
            }),
          {
            attempts,
            onAttempt: ({ attempt, delayMs }) => {
              span.setAttribute("ai.current_attempt", attempt);
              span.setAttribute("ai.retry_delay_ms", delayMs);

              Sentry.addBreadcrumb({
                category: "ai.retry",
                level: "info",
                message: `generateOnce ${label} retry`,
              });
            },
          },
        );

        const duration = Date.now() - startTime;
        span.setAttribute("ai.duration_ms", duration);
        span.setAttribute("ai.response_length", result.length);
        span.setAttribute("ai.success", true);

        // Log performance metrics
        Sentry.addBreadcrumb({
          category: "ai.performance",
          level: "info",
          message: `AI generation completed - ${label}`,
          data: {
            duration_ms: duration,
            response_length: result.length,
            model,
            attempts,
          },
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        span.setAttribute("ai.duration_ms", duration);
        span.setAttribute("ai.success", false);
        span.setAttribute("ai.error", String(error));

        Sentry.captureException(error, {
          tags: {
            operation: "ai.generation",
            label,
            model,
          },
          extra: {
            duration_ms: duration,
            attempts,
          },
        });

        throw error;
      }
    },
  );
}
import { detectAssessmentFromText } from "@/shared/ai/detect-assessment";
import {
  AssessmentResultSchema,
  type AssessmentResultParsed,
} from "@/shared/ai/assessment-result.schema";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import type { Id } from "@/../convex/_generated/dataModel";
import { buildSystemPrompt } from "../prompt-builder";
import { sanitizeModules } from "@/shared/ai/sanitize-modules";

// Narrow utility types
type TextChunk = { readonly text?: string };
type ConversationCreateResult = { readonly conversationId?: string | null };

function isAsyncIterable<T>(obj: unknown): obj is AsyncIterable<T> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as { [Symbol.asyncIterator]?: unknown })[
      Symbol.asyncIterator
    ] === "function"
  );
}

// Remove any ```json \n ... \n ``` blocks from a text blob (used to avoid storing raw JSON in chat history)
function stripAssessmentJson(text: string): string {
  try {
    return text.replace(/```json[\s\S]*?```/g, "").trim();
  } catch {
    return text;
  }
}

// Helpers to cast string to Convex Ids
const asAiSkillsId = (s: string): Id<"aiSkills"> =>
  s as unknown as Id<"aiSkills">;
const asAiConversationsId = (s: string): Id<"aiConversations"> =>
  s as unknown as Id<"aiConversations">;

export type SendRequest = {
  readonly skillId: string;
  readonly message: string;
};

export type SendResponse = {
  readonly sessionId: string;
  readonly conversationId?: string | null;
};

export async function persistIfValidAssessment(params: {
  readonly sessionId: string;
  readonly text: string;
  readonly skillId: string;
  readonly convexToken: string | null | undefined;
  readonly allowedUrls?: readonly string[];
}): Promise<void> {
  const { sessionId, text, skillId, convexToken, allowedUrls } = params;
  if (!text || !convexToken) return;

  // Use session-based lock to prevent duplicate persistence.
  if (!setAssessmentPersisted(sessionId)) {
    Sentry.addBreadcrumb({
      category: "ai.assessment",
      level: "info",
      message: "assessment_already_persisted_in_session",
    });
    return; // Lock not acquired, already persisted.
  }

  await Sentry.startSpan(
    { op: "ai.persist", name: "storeAssessment" },
    async (span) => {
      try {
        const detected = detectAssessmentFromText(text);
        span?.setAttribute?.("detected.valid", detected.valid);
        if (!detected.valid || !detected.data) return;

        const parsed = AssessmentResultSchema.safeParse(detected.data);
        if (!parsed.success) return;

        span?.setAttribute?.("detected.parsed", true);
        Sentry.addBreadcrumb({
          category: "ai.assessment",
          level: "info",
          message: "valid_assessment_detected_and_persisting",
          data: {
            level: parsed.data.level,
            modules: parsed.data.learningModules.length,
            hasReasoning: !!parsed.data.reasoning,
          },
        });

        const payload: AssessmentResultParsed = {
          level: parsed.data.level,
          confidence: parsed.data.confidence,
          reasoning: parsed.data.reasoning,
          learningModules: Array.from(
            sanitizeModules(parsed.data.learningModules, allowedUrls),
          ),
        };

        await fetchMutation(
          api.aiAssessments.storeAssessment,
          {
            aiSkillId: skillId as Id<"aiSkills">,
            result: payload,
          },
          { token: convexToken },
        );
        Sentry.captureMessage("assessment_persisted_successfully", {
          level: "info",
        });
      } catch (err) {
        Sentry.captureException(err);
        // NOTE: We do not reset the flag here. A failed persistence should still
        // prevent retries on the same session to avoid duplicates.
        // A new user action should trigger a new session if a retry is needed.
      }
    },
  );
}

function simulateStreaming(sessionId: string, locale: "ar" | "en"): void {
  try {
    setRunning(sessionId);
    const chunks: readonly string[] =
      locale === "ar"
        ? [
            "## مثال ماركداون\n\n",
            "- عنصر أول\n",
            "- عنصر ثانٍ\n\n",
            "```ts\nfunction greet(name: string): string {\n  return `مرحبا، ${name}`;\n}\n```\n\n",
            "> تذكير: هذا رد تجريبي للتأكد من دعم الـ Markdown.",
          ]
        : [
            "## Markdown Example\n\n",
            "- First item\n",
            "- Second item\n\n",
            "```ts\nfunction greet(name: string): string {\n  return `Hello, ${name}`;\n}\n```\n\n",
            "> Note: This is a dummy reply to verify Markdown rendering.",
          ];

    let delay = 120;
    chunks.forEach((c, i) => {
      setTimeout(() => {
        appendPartial(sessionId, c);
        if (i === chunks.length - 1) setDone(sessionId);
      }, delay);
      delay += 120;
    });
  } catch (err) {
    setError(sessionId, err instanceof Error ? err.message : "unknown_error");
    Sentry.captureException(err);
  }
}

async function runGeminiGeneration(
  sessionId: string,
  params: {
    readonly message: string;
    readonly skillId: string;
    readonly locale: "ar" | "en";
    readonly conversationId?: string | null;
    readonly convexToken?: string | null;
    readonly systemPrompt?: string | null;
    readonly allowedUrls?: readonly string[] | null;
  },
): Promise<void> {
  setRunning(sessionId);
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  // Use faster Gemini Flash models for better response times
  const modelPrimary = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const modelFallback =
    process.env.GEMINI_MODEL_FALLBACK ?? "gemini-1.5-flash-8b";

  // Simulation fallback:
  // - In test: simulate only when there's no API key AND no convex token (simple integration test)
  // - In non-test: simulate when there's no API key
  if (
    (!apiKey && process.env.NODE_ENV !== "test") ||
    (!apiKey && process.env.NODE_ENV === "test" && !params.convexToken)
  ) {
    simulateStreaming(sessionId, params.locale);
    return;
  }

  const systemInstruction = {
    role: "system" as const,
    parts: [
      {
        text:
          params.systemPrompt && params.systemPrompt.trim().length > 0
            ? params.systemPrompt
            : params.locale === "ar"
              ? [
                  "أنت مساعد يقيم مهارات المستخدم ويقترح مسار تعلم.",
                  "اكتب إجابة موجزة وصحيحة.",
                  "سياسة اللغة: أجب دائمًا بالعربية الفصحى الواضحة ولا تغيّر اللغة مهما كتب المستخدم.",
                  "سلوك البداية: عند تلقي رسالة المستخدم '__start__' فقط، عرّف نفسك بإيجاز كمساعد تقييم، وقدّم تحية قصيرة وودودة، واشرح بإيجاز ما سيحدث، ثم اسأل إن كان مستعدًا للبدء. إذا لم تكن الرسالة '__start__' فتجاهل التحية وابدأ مباشرة بالتقييم. لا تعِد التحية لاحقًا.",
                  "أخرج في النهاية مقطع JSON صالح بهذا الهيكل المحدد داخل كتلة ```json:",
                  "{",
                  "  skill?: string,",
                  "  level: number (1-5),",
                  "  confidence: number (0-1),",
                  "  reasoning?: string,",
                  "  learningModules: [",
                  "    {",
                  "      id: string,",
                  "      title: string,",
                  "      type: 'article'|'video'|'quiz'|'project',",
                  "      duration: string,",
                  "      description: string,  // مطلوب - اشرح ما تعلمه هذه الوحدة",
                  "      objectives: [string, string, ...],  // مطلوب - 2-4 أهداف تعليمية",
                  "      outline: [string, string, string, ...],  // مطلوب - 3-5 خطوات تفصيلية",
                  "      resourceUrl?: string,  // اختياري",
                  "      searchKeywords?: [string, ...]  // اختياري",
                  "    }",
                  "    // ... 3-6 وحدات إجمالي",
                  "  ]",
                  "}",
                  "التحقق: كل كائن وحدة يجب أن يحتوي على description و objectives array و outline array وإلا سيرفضه النظام.",
                  "مثال:",
                  "```json",
                  "{",
                  "  skill: 'math',",
                  "  level: 3,",
                  "  confidence: 0.8,",
                  "  reasoning: 'الطالب يحتاج إلى تعلم أساسيات الجبر.',",
                  "  learningModules: [",
                  "    {",
                  "      id: 'module-1', title: 'أساسيات الجبر', type: 'article', duration: '15 دقيقة',",
                  "      description: 'مقدمة في المفاهيم والعمليات الجبرية',",
                  "      objectives: ['فهم المتغيرات', 'حل المعادلات البسيطة'],",
                  "      outline: ['المتغيرات والثوابت', 'العمليات الأساسية', 'المعادلات البسيطة'],",
                  "      searchKeywords: ['جبر', 'متغيرات', 'معادلات', 'رياضيات أساسية']",
                  "    },",
                  "    {",
                  "      id: 'module-2', title: 'المعادلات الخطية', type: 'video', duration: '20 دقيقة',",
                  "      description: 'حل المعادلات الخطية خطوة بخطوة',",
                  "      objectives: ['حل المعادلات الخطية', 'رسم الدوال الخطية'],",
                  "      outline: ['معادلات متغير واحد', 'أنظمة متغيرين', 'الرسم البياني'],",
                  "      resourceUrl: 'https://khanacademy.org/math/algebra/linear-equations'",
                  "    }",
                  "  ]",
                  "}",
                  "```",
                ].join("\n")
              : [
                  "You assess the user's skill and propose a learning path.",
                  "Respond clearly and concisely.",
                  "Language policy: Always respond in English; do not change language regardless of the user's input.",
                  "Start behavior: Only when the user input is '__start__', briefly introduce yourself as the assessment assistant, greet once, describe what will happen, and ask if they are ready. If the input is not '__start__', do not greet—proceed directly with assessment. Greet only once per conversation.",
                  "About Sawaed (when asked only): Sawaed helps youth discover and grow their skills through short assessments and tailored learning paths. Answer briefly and immediately return to the assessment.",
                  "At the end, output a valid JSON block inside ```json with this EXACT structure:",
                  "{",
                  "  skill?: string,",
                  "  level: number (1-5),",
                  "  confidence: number (0-1),",
                  "  reasoning?: string,",
                  "  learningModules: [",
                  "    {",
                  "      id: string,",
                  "      title: string,",
                  "      type: 'article'|'video'|'quiz'|'project',",
                  "      duration: string,",
                  "      description: string,  // REQUIRED - explain what this module teaches",
                  "      objectives: [string, string, ...],  // REQUIRED - 2-4 learning goals",
                  "      outline: [string, string, string, ...],  // REQUIRED - 3-5 step breakdown",
                  "      resourceUrl?: string,  // optional",
                  "      searchKeywords?: [string, ...]  // optional",
                  "    }",
                  "    // ... 3-6 modules total",
                  "  ]",
                  "}",
                  "VALIDATION: Every module object MUST contain description, objectives array, and outline array or the system will reject it.",
                  "Example:",
                  "```json",
                  "{",
                  "  skill: 'math',",
                  "  level: 3,",
                  "  confidence: 0.8,",
                  "  reasoning: 'The student needs to learn algebra basics.',",
                  "  learningModules: [",
                  "    {",
                  "      id: 'module-1', title: 'Algebra Basics', type: 'article', duration: '15 minutes',",
                  "      description: 'Introduction to algebraic concepts and operations',",
                  "      objectives: ['Understand variables', 'Solve simple equations'],",
                  "      outline: ['Variables and constants', 'Basic operations', 'Simple equations'],",
                  "      searchKeywords: ['algebra', 'variables', 'equations', 'math basics']",
                  "    },",
                  "    {",
                  "      id: 'module-2', title: 'Linear Equations', type: 'video', duration: '20 minutes',",
                  "      description: 'Solving linear equations step by step',",
                  "      objectives: ['Solve linear equations', 'Graph linear functions'],",
                  "      outline: ['One-variable equations', 'Two-variable systems', 'Graphing'],",
                  "      resourceUrl: 'https://khanacademy.org/math/algebra/linear-equations'",
                  "    }",
                  "  ]",
                  "}",
                  "```",
                ].join("\n"),
      },
    ],
  };
  // Build contents from prior conversation history when available
  let contents: Array<{
    readonly role: "user" | "model" | "system";
    readonly parts: ReadonlyArray<{ readonly text: string }>;
  }> = [];
  try {
    if (
      params.convexToken &&
      params.conversationId &&
      process.env.NODE_ENV !== "test"
    ) {
      const history = await fetchQuery(
        api.aiMessages.listByConversation,
        { conversationId: params.conversationId as Id<"aiConversations"> },
        { token: params.convexToken },
      );
      const mapped = history.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : m.role,
        parts: [{ text: m.content }],
      }));
      contents = mapped;
    }
  } catch (err) {
    Sentry.captureException(err);
  }
  // Append the current user message last
  contents.push({
    role: "user" as const,
    parts: [{ text: params.message }],
  });

  // Wrap entire generation in a span with useful attributes
  await Sentry.startSpan(
    { op: "ai.generate", name: "gemini_generation" },
    async (span) => {
      span.setAttribute("skillId", params.skillId);
      span.setAttribute("locale", params.locale);
      span.setAttribute("model.primary", modelPrimary);
      span.setAttribute("model.fallback", modelFallback);

      // Track whether we received any streaming chunks
      let gotChunk = false;
      let completed = false;
      // Eager persistence guard to avoid duplicate writes
      let persistedMessage = false;

      // Try streaming on primary model
      try {
        await retryAsync(
          () =>
            generateWithStreaming(
              {
                model: modelPrimary,
                apiKey,
                contents,
                systemInstruction,
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 8000,
                  topP: 0.8,
                },
              },
              {
                onChunkText: (t) => {
                  gotChunk = true;
                  appendPartial(sessionId, t);
                  // Only detect complete assessments to prevent premature persistence
                  if (params.convexToken && params.message !== "__start__") {
                    const sNow = getSession(sessionId);
                    if (sNow?.text) {
                      // Check if we have a complete JSON block (ends with ```)
                      const hasCompleteJsonBlock =
                        /```json[\s\S]*?```\s*$/.test(sNow.text);
                      if (hasCompleteJsonBlock) {
                        const det = detectAssessmentFromText(sNow.text);
                        if (det.valid) {
                          // fire and forget
                          // eslint-disable-next-line @typescript-eslint/no-floating-promises
                          persistIfValidAssessment({
                            sessionId,
                            text: sNow.text,
                            skillId: params.skillId,
                            convexToken: params.convexToken,
                            allowedUrls: params.allowedUrls ?? undefined,
                          });
                        }
                      }
                    }
                  }
                },
                onDone: () => {
                  void (async () => {
                    completed = true;
                    // If streaming yielded nothing, try one-shot generation before finishing
                    if (!gotChunk) {
                      try {
                        const textPrimary = await generateWithRetry(
                          modelPrimary,
                          apiKey,
                          contents,
                          systemInstruction,
                          3,
                          "primary",
                        );
                        if (textPrimary && textPrimary.trim().length > 0) {
                          appendPartial(sessionId, textPrimary);
                        } else {
                          const textFallback = await generateWithRetry(
                            modelFallback,
                            apiKey,
                            contents,
                            systemInstruction,
                            3,
                            "fallback",
                          );
                          if (textFallback && textFallback.trim().length > 0) {
                            appendPartial(sessionId, textFallback);
                          }
                        }
                      } catch (err) {
                        Sentry.captureException(err);
                      }
                    }
                    // Skip validation for simple user responses (single letters, short answers)
                    const isSimpleResponse =
                      /^[a-dA-D]$|^\d+$|^(نعم|لا|yes|no)$/i.test(
                        params.message.trim(),
                      );
                    if (params.message !== "__start__" && !isSimpleResponse) {
                      try {
                        await validateAndMaybeRepair(
                          sessionId,
                          params.locale,
                          apiKey,
                          modelPrimary,
                          modelFallback,
                          contents,
                          systemInstruction,
                        );
                      } catch (e) {
                        Sentry.captureException(e);
                        try {
                          setError(sessionId, "validation_failed");
                        } catch {}
                      }
                    }
                    const s1 = getSession(sessionId);
                    if (!s1?.text?.trim()) {
                      setError(sessionId, "empty_response");
                    } else {
                      setDone(sessionId);
                      // Persist assistant final message always; persist assessment only if valid
                      try {
                        if (params.convexToken) {
                          let convoId = params.conversationId;
                          if (!convoId) {
                            const created = await fetchMutation(
                              api.aiConversations.createOrGetActive,
                              {
                                aiSkillId: asAiSkillsId(params.skillId),
                                language: params.locale,
                              },
                              { token: params.convexToken },
                            );
                            const conv =
                              created as unknown as ConversationCreateResult;
                            convoId = conv.conversationId ?? undefined;
                          }
                          if (convoId) {
                            Sentry.addBreadcrumb({
                              category: "chat.send",
                              level: "info",
                              message: "persist_assistant_message_start",
                              data: { conversationId: convoId },
                            });
                            const s1 = getSession(sessionId);
                            const assistantText = s1?.text ?? "";
                            // Only persist message once across all generation paths
                            let assistantResult: {
                              messageId: string;
                              totalQuestions: number;
                            } | null = null;
                            if (!persistedMessage) {
                              assistantResult = await fetchMutation(
                                api.aiMessages.addAssistantMessage,
                                {
                                  conversationId: asAiConversationsId(convoId),
                                  // Store assistant text without embedded assessment JSON block
                                  content: stripAssessmentJson(assistantText),
                                  // Mark greeting as questionNumber=0 when the input was the auto-start trigger
                                  // For regular questions, let the mutation auto-increment
                                  questionNumber:
                                    params.message === "__start__"
                                      ? 0
                                      : undefined,
                                },
                                { token: params.convexToken },
                              );
                              persistedMessage = true;
                            }

                            // Log question tracking for monitoring
                            Sentry.addBreadcrumb({
                              category: "chat.assessment",
                              level: "info",
                              message: "question_tracked",
                              data: {
                                conversationId: convoId,
                                totalQuestions:
                                  assistantResult?.totalQuestions ?? 0,
                              },
                            });
                            Sentry.addBreadcrumb({
                              category: "chat.send",
                              level: "info",
                              message: "persist_assistant_message_done",
                              data: { conversationId: convoId },
                            });
                            // Assessment persistence is handled during streaming when complete JSON is detected
                            // No need to persist again here to avoid duplicates
                          } else {
                            Sentry.addBreadcrumb({
                              category: "chat.send",
                              level: "warning",
                              message:
                                "persist_assistant_message_skipped_no_conversation",
                            });
                          }
                        } else {
                          Sentry.addBreadcrumb({
                            category: "chat.send",
                            level: "warning",
                            message:
                              "persist_assistant_message_skipped_no_token",
                          });
                        }
                      } catch (err) {
                        Sentry.captureException(err);
                      }
                    }
                  })();
                },
              },
            ).then(async (ret) => {
              // If mock returned an async iterable, consume it and call callbacks
              if (isAsyncIterable<TextChunk>(ret)) {
                try {
                  for await (const chunk of ret) {
                    const text: string | undefined = chunk.text;
                    if (typeof text === "string") {
                      gotChunk = true;
                      appendPartial(sessionId, text);
                    }
                  }
                } finally {
                  // invoke onDone flow
                  completed = true;
                  if (!gotChunk) {
                    try {
                      const textPrimary = await generateWithRetry(
                        modelPrimary,
                        apiKey,
                        contents,
                        systemInstruction,
                        3,
                        "primary",
                      );
                      if (textPrimary && textPrimary.trim().length > 0) {
                        appendPartial(sessionId, textPrimary);
                      }
                    } catch (err) {
                      Sentry.captureException(err);
                    }
                  }
                  // Skip validation for simple user responses
                  const isSimpleResponse =
                    /^[a-dA-D]$|^\d+$|^(نعم|لا|yes|no)$/i.test(
                      params.message.trim(),
                    );
                  if (params.message !== "__start__" && !isSimpleResponse) {
                    try {
                      await validateAndMaybeRepair(
                        sessionId,
                        params.locale,
                        apiKey,
                        modelPrimary,
                        modelFallback,
                        contents,
                        systemInstruction,
                      );
                    } catch (e) {
                      Sentry.captureException(e);
                      try {
                        setError(sessionId, "validation_failed");
                      } catch {}
                    }
                  }
                  const s1 = getSession(sessionId);
                  if (!s1?.text?.trim()) {
                    setError(sessionId, "empty_response");
                  } else {
                    setDone(sessionId);
                    // Persist assistant final message always; persist assessment only if valid
                    try {
                      if (params.convexToken) {
                        let convoId = params.conversationId;
                        if (!convoId) {
                          const created = await fetchMutation(
                            api.aiConversations.createOrGetActive,
                            {
                              aiSkillId: asAiSkillsId(params.skillId),
                              language: params.locale,
                            },
                            { token: params.convexToken },
                          );
                          const conv =
                            created as unknown as ConversationCreateResult;
                          convoId = conv.conversationId ?? undefined;
                        }
                        if (convoId) {
                          Sentry.addBreadcrumb({
                            category: "chat.send",
                            level: "info",
                            message: "persist_assistant_message_start",
                            data: { conversationId: convoId },
                          });
                          // Only persist message once across all generation paths
                          let assistantResult: {
                            messageId: string;
                            totalQuestions: number;
                          } | null = null;
                          if (!persistedMessage) {
                            assistantResult = await fetchMutation(
                              api.aiMessages.addAssistantMessage,
                              {
                                conversationId: asAiConversationsId(convoId),
                                content: stripAssessmentJson(s1.text),
                                // Mark greeting as questionNumber=0 when the input was the auto-start trigger
                                // For regular questions, let the mutation auto-increment
                                questionNumber:
                                  params.message === "__start__"
                                    ? 0
                                    : undefined,
                              },
                              { token: params.convexToken },
                            );
                            persistedMessage = true;
                          }

                          // Log question tracking for monitoring
                          Sentry.addBreadcrumb({
                            category: "chat.assessment",
                            level: "info",
                            message: "question_tracked",
                            data: {
                              conversationId: convoId,
                              totalQuestions:
                                assistantResult?.totalQuestions ?? 0,
                            },
                          });
                          Sentry.addBreadcrumb({
                            category: "chat.send",
                            level: "info",
                            message: "persist_assistant_message_done",
                            data: { conversationId: convoId },
                          });
                          // Assessment persistence is handled during streaming when complete JSON is detected
                          // No need to persist again here to avoid duplicates
                        } else {
                          Sentry.addBreadcrumb({
                            category: "chat.send",
                            level: "warning",
                            message:
                              "persist_assistant_message_skipped_no_conversation",
                          });
                        }
                      } else {
                        Sentry.addBreadcrumb({
                          category: "chat.send",
                          level: "warning",
                          message: "persist_assistant_message_skipped_no_token",
                        });
                      }
                    } catch (err) {
                      Sentry.captureException(err);
                    }
                  }
                }
              }
            }),
          {
            attempts: 3,
            onAttempt: ({ attempt, delayMs }) => {
              Sentry.addBreadcrumb({
                category: "ai.retry",
                level: "info",
                message: "streaming primary retry",
                data: { attempt, delayMs, model: modelPrimary },
              });
            },
          },
        );
      } catch (err) {
        Sentry.captureException(err);
      }

      // If mocked streaming didn't invoke callbacks, finalize now
      if (!completed) {
        try {
          if (!gotChunk) {
            const text = await generateWithRetry(
              modelPrimary,
              apiKey,
              contents,
              systemInstruction,
              3,
              "primary",
            );
            if (text && text.trim().length > 0) {
              appendPartial(sessionId, text);
            }
          }
          // Skip validation for simple user responses
          const isSimpleResponse = /^[a-dA-D]$|^\d+$|^(نعم|لا|yes|no)$/i.test(
            params.message.trim(),
          );
          if (params.message !== "__start__" && !isSimpleResponse) {
            await validateAndMaybeRepair(
              sessionId,
              params.locale,
              apiKey,
              modelPrimary,
              modelFallback,
              contents,
              systemInstruction,
            );
          }
          const s1 = getSession(sessionId);
          if (!s1?.text?.trim()) {
            setError(sessionId, "empty_response");
          } else {
            setDone(sessionId);
            // Persist assistant final message always; persist assessment only if valid
            try {
              if (params.convexToken) {
                let convoId = params.conversationId;
                if (!convoId) {
                  const created = await fetchMutation(
                    api.aiConversations.createOrGetActive,
                    {
                      aiSkillId: asAiSkillsId(params.skillId),
                      language: params.locale,
                    },
                    { token: params.convexToken },
                  );
                  if (
                    created &&
                    (created as ConversationCreateResult).conversationId
                  ) {
                    convoId = (created as ConversationCreateResult)
                      .conversationId;
                  }
                }
                if (convoId) {
                  Sentry.addBreadcrumb({
                    category: "chat.send",
                    level: "info",
                    message: "persist_assistant_message_start",
                    data: { conversationId: convoId },
                  });
                  // Only persist message once across all generation paths
                  let assistantResult: {
                    messageId: string;
                    totalQuestions: number;
                  } | null = null;
                  if (!persistedMessage) {
                    assistantResult = await fetchMutation(
                      api.aiMessages.addAssistantMessage,
                      {
                        conversationId: asAiConversationsId(convoId),
                        content: stripAssessmentJson(s1.text),
                        // Mark greeting as questionNumber=0 when the input was the auto-start trigger
                        // For regular questions, let the mutation auto-increment
                        questionNumber:
                          params.message === "__start__" ? 0 : undefined,
                      },
                      { token: params.convexToken },
                    );
                    persistedMessage = true;
                  }

                  // Log question tracking for monitoring
                  Sentry.addBreadcrumb({
                    category: "chat.assessment",
                    level: "info",
                    message: "question_tracked",
                    data: {
                      conversationId: convoId,
                      totalQuestions: assistantResult?.totalQuestions ?? 0,
                    },
                  });
                  Sentry.addBreadcrumb({
                    category: "chat.send",
                    level: "info",
                    message: "persist_assistant_message_done",
                    data: { conversationId: convoId },
                  });
                  // Assessment persistence is handled during streaming when complete JSON is detected
                  // No need to persist again here to avoid duplicates
                } else {
                  Sentry.addBreadcrumb({
                    category: "chat.send",
                    level: "warning",
                    message:
                      "persist_assistant_message_skipped_no_conversation",
                  });
                }
              } else {
                Sentry.addBreadcrumb({
                  category: "chat.send",
                  level: "warning",
                  message: "persist_assistant_message_skipped_no_token",
                });
              }
            } catch (err) {
              Sentry.captureException(err);
            }
          }
        } catch (err) {
          Sentry.captureException(err);
        }
      }
    },
  );
}

// ...

async function validateAndMaybeRepair(
  sessionId: string,
  locale: "ar" | "en",
  apiKey: string,
  modelPrimary: string,
  modelFallback: string,
  contents: ReadonlyArray<{
    readonly role?: "user" | "model" | "system";
    readonly parts: ReadonlyArray<{ readonly text: string }>;
  }>,
  _baseInstruction: {
    readonly role?: "user" | "model" | "system";
    readonly parts: ReadonlyArray<{ readonly text: string }>;
  },
): Promise<void> {
  const s = getSession(sessionId);
  if (!s?.text) return;

  await Sentry.startSpan(
    { op: "ai.validate", name: "validateAndMaybeRepair" },
    async (span) => {
      span?.setAttribute?.("sessionId", sessionId);
      span?.setAttribute?.("locale", locale);
      // Slightly higher attempts to improve recovery when JSON is truncated
      const primaryAttempts = 1;
      const fallbackAttempts = 1;
      span?.setAttribute?.("repair.primary.attempts", primaryAttempts);
      span?.setAttribute?.("repair.fallback.attempts", fallbackAttempts);
      const first = detectAssessmentFromText(s.text);
      span?.setAttribute?.("first.valid", first.valid);
      if (first.valid) return;

      // Detect if the last JSON block looks truncated (unbalanced braces/brackets)
      const lastJsonBlockMatch = /```json\s*([\s\S]*?)$/i.exec(s.text);
      const lastBlock = lastJsonBlockMatch?.[1] ?? "";
      const looksTruncated = (() => {
        if (!lastBlock) return false;
        const openCurly = (lastBlock.match(/\{/g) ?? []).length;
        const closeCurly = (lastBlock.match(/\}/g) ?? []).length;
        const openSquare = (lastBlock.match(/\[/g) ?? []).length;
        const closeSquare = (lastBlock.match(/\]/g) ?? []).length;
        return closeCurly < openCurly || closeSquare < openSquare;
      })();

      // Stricter instruction to convert the prior answer into valid JSON only
      const strictInstruction = {
        role: "system" as const,
        parts: [
          {
            text:
              locale === "ar"
                ? "أخرج فقط JSON صالح وفق المخطط المذكور سابقاً داخل كتلة ```json دون أي نص إضافي."
                : "Output only valid JSON per the above schema inside a ```json block with no extra text.",
          },
        ],
      };

      // If truncated, ask explicitly to continue and finish the JSON only
      const continuationInstruction = {
        role: "system" as const,
        parts: [
          {
            text:
              locale === "ar"
                ? "أكمل JSON السابق من حيث توقف بحيث يصبح كاملاً وصالحاً وفق المخطط. أعد فقط JSON داخل كتلة ```json دون أي نص آخر."
                : "Continue the previous JSON from where it stopped and return a complete, valid JSON per the schema. Return ONLY the JSON inside a ```json block with no extra text.",
          },
        ],
      } as const;

      // Ask the model to transform its prior answer into valid JSON
      const priorForModel = ((): string => {
        if (lastBlock && lastBlock.length > 0) return lastBlock.slice(-2000);
        return s.text.slice(-2000);
      })();
      const repairContents = [
        ...contents,
        { role: "model" as const, parts: [{ text: priorForModel }] },
        {
          role: "user" as const,
          parts: [
            {
              text:
                locale === "ar"
                  ? "حوّل الإجابة السابقة إلى JSON صالح حسب المخطط فقط."
                  : "Transform the previous answer into valid JSON only per the schema.",
            },
          ],
        },
      ] as const;

      // Helper to run a repair attempt with retries and span
      const tryRepairWithModel = async (
        model: string,
        label: "primary" | "fallback",
      ): Promise<boolean> => {
        return Sentry.startSpan(
          { op: "ai.repair.attempt", name: `repair_${label}` },
          async (repairSpan) => {
            repairSpan?.setAttribute?.("model", model);
            try {
              const text = await retryAsync(
                () =>
                  generateOnce({
                    model,
                    apiKey,
                    contents: repairContents,
                    systemInstruction: looksTruncated
                      ? continuationInstruction
                      : strictInstruction,
                    generationConfig: {
                      temperature: 0.1, // Keep low for validation repair
                      maxOutputTokens: 8000, // Higher to prevent truncation on long arrays
                    },
                  }),
                {
                  attempts:
                    label === "primary" ? primaryAttempts : fallbackAttempts,
                  onAttempt: ({ attempt, delayMs }) => {
                    Sentry.addBreadcrumb({
                      category: "ai.repair",
                      level: "info",
                      message: `repair retry (${label})`,
                      data: { attempt, delayMs, model },
                    });
                  },
                },
              );
              const res = detectAssessmentFromText(text);
              repairSpan?.setAttribute?.("valid", res.valid);
              if (res.valid) {
                appendPartial(
                  sessionId,
                  `\n\n\u200e\n\n\`\`\`json\n${JSON.stringify(res.data)}\n\`\`\``,
                );
                Sentry.captureMessage(
                  label === "primary"
                    ? "gemini_assessment_repaired"
                    : "gemini_assessment_repaired_fallback",
                  { level: "info", extra: { sessionId, locale } },
                );
                return true;
              }
              // Simple JSON extraction without complex coercion
              try {
                const fencedRe = /```(?:json)?\s*([\s\S]*?)\s*```/i;
                const m = fencedRe.exec(text);
                if (m?.[1]) {
                  const candidate = JSON.parse(m[1]) as unknown;
                  const recheck = AssessmentResultSchema.safeParse(candidate);
                  if (recheck.success) {
                    appendPartial(
                      sessionId,
                      `\n\n\u200e\n\n\`\`\`json\n${JSON.stringify(recheck.data)}\n\`\`\``,
                    );
                    return true;
                  }
                }
              } catch {
                // Ignore parse errors - let it fail fast
              }
            } catch (err) {
              Sentry.captureException(err);
            }
            return false;
          },
        );
      };

      // Try primary then fallback
      const okPrimary = await tryRepairWithModel(modelPrimary, "primary");
      if (okPrimary) return;
      const okFallback = await tryRepairWithModel(modelFallback, "fallback");
      if (okFallback) return;

      // Final heuristic: if the last JSON block is truncated, try to auto-close braces/brackets
      try {
        if (lastBlock && looksTruncated) {
          const close = (src: string): string => {
            const openCurly = (src.match(/\{/g) ?? []).length;
            const closeCurly = (src.match(/\}/g) ?? []).length;
            const openSquare = (src.match(/\[/g) ?? []).length;
            const closeSquare = (src.match(/\]/g) ?? []).length;
            let out = src;
            for (let i = 0; i < openSquare - closeSquare; i += 1) out += "]";
            for (let i = 0; i < openCurly - closeCurly; i += 1) out += "}";
            return out;
          };
          const closed = close(lastBlock);
          const candidateText =
            `\n\n\u200e\n\n\`\`\`json\n${closed}\n\`\`\``.replace(/`/g, "`");
          // Validate quickly before appending
          try {
            const parsed = JSON.parse(closed) as unknown;
            const recheck = AssessmentResultSchema.safeParse(parsed);
            if (recheck.success) {
              appendPartial(
                sessionId,
                `\n\n\u200e\n\n\`\`\`json\n${JSON.stringify(recheck.data)}\n\`\`\``,
              );
              return;
            }
          } catch {
            // ignore
          }
          // As a last resort, append the closed block so the client can try again later
          appendPartial(sessionId, candidateText);
        }
      } catch (e) {
        Sentry.captureException(e);
      }

      Sentry.captureMessage("gemini_assessment_repair_failed", {
        level: "warning",
        extra: { sessionId, locale },
      });

      // Mark session as error if no valid JSON could be produced after repairs
      try {
        setError(sessionId, "assessment_repair_failed");
      } catch {}
    },
  );
}

export async function POST(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/chat/send" },
    async () => {
      // Basic per-IP rate limit: 10 requests per 10 seconds
      const ipKey = getClientIp(req);
      const rl = checkRateLimit(`${ipKey}:send`, 10, 10_000);
      if (!rl.allowed) {
        Sentry.captureMessage("chat_send_rate_limited", { level: "warning" });
        return new Response(JSON.stringify({ sessionId: "" } as SendResponse), {
          status: 429,
          headers: { "content-type": "application/json" },
        });
      }

      // Best-effort stale session cleanup (5 minutes max age, keep up to 200 entries)
      cleanupStaleSessions(5 * 60_000, 200);

      const localeHeader = req.headers.get("x-locale");
      const locale: "ar" | "en" = localeHeader === "ar" ? "ar" : "en";

      const parsed = SendRequestSchema.safeParse(await req.json());
      if (!parsed.success) {
        return new Response(JSON.stringify({ sessionId: "" } as SendResponse), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const session = createSession();

      // Prepare Convex auth token and build system prompt (no persistence before generation)
      let conversationId: string | null = null;
      let token: string | null = null;
      let systemPrompt: string | null = null;
      let allowedUrls: readonly string[] | null = null;
      try {
        token = (await convexAuthNextjsToken()) ?? null;
        Sentry.addBreadcrumb({
          category: "chat.send",
          level: "info",
          message: "convex_token_resolved",
          data: { hasToken: Boolean(token) },
        });
      } catch (err) {
        Sentry.captureException(err);
      }
      // Create or get a conversation up-front and persist the user's message
      // Skip in test environment to keep unit/integration tests deterministic
      if (token && process.env.NODE_ENV !== "test") {
        try {
          Sentry.addBreadcrumb({
            category: "chat.send",
            level: "info",
            message: "createOrGetActive_start",
            data: { skillId: parsed.data.skillId, locale },
          });
          const created = await fetchMutation(
            api.aiConversations.createOrGetActive,
            {
              aiSkillId: asAiSkillsId(parsed.data.skillId),
              language: locale,
            },
            { token },
          );
          const conv = created as unknown as ConversationCreateResult;
          conversationId = conv.conversationId ?? null;
          Sentry.addBreadcrumb({
            category: "chat.send",
            level: "info",
            message: "createOrGetActive_done",
            data: { conversationId },
          });
          if (conversationId && parsed.data.message !== "__start__") {
            Sentry.addBreadcrumb({
              category: "chat.send",
              level: "info",
              message: "persist_user_message_start",
              data: { conversationId },
            });
            await fetchMutation(
              api.aiMessages.addUserMessage,
              {
                conversationId: asAiConversationsId(conversationId),
                content: parsed.data.message,
              },
              { token },
            );
            Sentry.addBreadcrumb({
              category: "chat.send",
              level: "info",
              message: "persist_user_message_done",
              data: { conversationId },
            });
          }
        } catch (err) {
          Sentry.captureException(err);
        }
      }
      try {
        const built = await buildSystemPrompt({
          aiSkillId: parsed.data.skillId,
          locale,
          convexToken: token,
        });
        systemPrompt = built.systemPrompt;
        allowedUrls = Array.from(built.allowedUrls);
      } catch (err) {
        Sentry.captureException(err);
      }
      // Bridge Gemini streaming responses into in-memory store used by polling endpoint
      // Fire-and-forget to keep the route fast
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      runGeminiGeneration(session.sessionId, {
        message: parsed.data.message,
        skillId: parsed.data.skillId,
        locale,
        conversationId,
        convexToken: token,
        systemPrompt,
        allowedUrls,
      });
      return new Response(
        JSON.stringify({
          sessionId: session.sessionId,
          conversationId,
        } satisfies SendResponse),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );
    },
  );
}
