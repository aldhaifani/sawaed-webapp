const SendRequestSchema = z.object({
  skillId: z.string().min(1),
  message: z.string().min(1),
});

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  appendPartial,
  createSession,
  setDone,
  setError,
  setRunning,
  getSession,
} from "../_store";
import { cleanupStaleSessions } from "../_store";
import { checkRateLimit, getClientIp } from "../_rateLimit";
import { generateOnce, generateWithStreaming } from "@/lib/gemini";
import { retryAsync } from "@/lib/retry";
import { detectAssessmentFromText } from "@/shared/ai/detect-assessment";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import type { Id } from "@/../convex/_generated/dataModel";
import { buildSystemPrompt } from "../prompt-builder";

export type SendRequest = {
  readonly skillId: string;
  readonly message: string;
};

export type SendResponse = {
  readonly sessionId: string;
  readonly conversationId?: string | null;
};

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
  },
): Promise<void> {
  setRunning(sessionId);
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const modelPrimary = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-lite";
  const modelFallback =
    process.env.GEMINI_MODEL_FALLBACK ?? "gemini-2.0-flash-lite";

  // Simulation fallback for tests or local dev without key
  if (!apiKey || process.env.NODE_ENV === "test") {
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
                  "أخرج في النهاية مقطع JSON صالح وفق المخطط التالي فقط داخل كتلة ```json:",
                  "{",
                  "  skill?: string,",
                  "  level: number (1-5),",
                  "  confidence: number (0-1),",
                  "  reasoning?: string,",
                  "  learningModules: Array<",
                  "    { id: string, title: string, type: 'article'|'video'|'quiz'|'project', duration: string }",
                  "  > بطول من 3 إلى 6",
                  "}",
                  "لا تستخدم مفاتيح إضافية. إذا استخدمت 'modules' حوِّلها إلى 'learningModules'.",
                  "مثال:",
                  "```json",
                  "{",
                  "  skill: 'math',",
                  "  level: 3,",
                  "  confidence: 0.8,",
                  "  reasoning: 'الطالب يحتاج إلى تعلم أساسيات الجبر.',",
                  "  learningModules: [",
                  "    { id: 'module-1', title: 'الجبر', type: 'article', duration: '10 دقائق' },",
                  "    { id: 'module-2', title: 'المعادلات', type: 'video', duration: '20 دقيقة' },",
                  "    { id: 'module-3', title: 'التفاضل', type: 'quiz', duration: '30 دقيقة' },",
                  "    { id: 'module-4', title: 'التكامل', type: 'project', duration: '1 ساعة' },",
                  "    { id: 'module-5', title: 'الاحصاء', type: 'article', duration: '40 دقيقة' },",
                  "    { id: 'module-6', title: 'الجبر الخطي', type: 'video', duration: '50 دقيقة' }",
                  "  ]",
                  "}",
                  "```",
                ].join("\n")
              : [
                  "You assess the user's skill and propose a learning path.",
                  "Respond clearly and concisely.",
                  "At the end, output a valid JSON block inside ```json matching this schema only:",
                  "{",
                  "  skill?: string,",
                  "  level: number (1-5),",
                  "  confidence: number (0-1),",
                  "  reasoning?: string,",
                  "  learningModules: Array<",
                  "    { id: string, title: string, type: 'article'|'video'|'quiz'|'project', duration: string }",
                  "  > with length between 3 and 6",
                  "}",
                  "Do not include extra keys. If you used 'modules', rename to 'learningModules'.",
                  "Example:",
                  "```json",
                  "{",
                  "  skill: 'math',",
                  "  level: 3,",
                  "  confidence: 0.8,",
                  "  reasoning: 'The student needs to learn algebra basics.',",
                  "  learningModules: [",
                  "    { id: 'module-1', title: 'Algebra', type: 'article', duration: '10 minutes' },",
                  "    { id: 'module-2', title: 'Equations', type: 'video', duration: '20 minutes' },",
                  "    { id: 'module-3', title: 'Differential', type: 'quiz', duration: '30 minutes' },",
                  "    { id: 'module-4', title: 'Integral', type: 'project', duration: '1 hour' },",
                  "    { id: 'module-5', title: 'Statistics', type: 'article', duration: '40 minutes' },",
                  "    { id: 'module-6', title: 'Linear Algebra', type: 'video', duration: '50 minutes' }",
                  "  ]",
                  "}",
                  "```",
                ].join("\n"),
      },
    ],
  };

  const contents = [
    {
      role: "user" as const,
      parts: [
        {
          text: params.message,
        },
      ],
    },
  ];

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
                  topP: 0.9,
                  maxOutputTokens: 2048,
                },
              },
              {
                onChunkText: (t) => {
                  gotChunk = true;
                  appendPartial(sessionId, t);
                },
                onDone: () => {
                  void (async () => {
                    // If streaming yielded nothing, try one-shot generation before finishing
                    if (!gotChunk) {
                      try {
                        const textPrimary = await retryAsync(
                          () =>
                            generateOnce({
                              model: modelPrimary,
                              apiKey,
                              contents,
                              systemInstruction,
                              generationConfig: {
                                temperature: 0.2,
                                topP: 0.9,
                                maxOutputTokens: 2048,
                              },
                            }),
                          {
                            attempts: 3,
                            onAttempt: ({ attempt, delayMs }) => {
                              Sentry.addBreadcrumb({
                                category: "ai.retry",
                                level: "info",
                                message: "generateOnce primary retry",
                                data: { attempt, delayMs, model: modelPrimary },
                              });
                            },
                          },
                        );
                        if (textPrimary && textPrimary.trim().length > 0) {
                          appendPartial(sessionId, textPrimary);
                        } else {
                          const textFallback = await retryAsync(
                            () =>
                              generateOnce({
                                model: modelFallback,
                                apiKey,
                                contents,
                                systemInstruction,
                                generationConfig: {
                                  temperature: 0.2,
                                  topP: 0.9,
                                  maxOutputTokens: 2048,
                                },
                              }),
                            {
                              attempts: 3,
                              onAttempt: ({ attempt, delayMs }) => {
                                Sentry.addBreadcrumb({
                                  category: "ai.retry",
                                  level: "info",
                                  message: "generateOnce fallback retry",
                                  data: {
                                    attempt,
                                    delayMs,
                                    model: modelFallback,
                                  },
                                });
                              },
                            },
                          );
                          if (textFallback && textFallback.trim().length > 0) {
                            appendPartial(sessionId, textFallback);
                          }
                        }
                      } catch (err) {
                        Sentry.captureException(err);
                      }
                    }
                    await validateAndMaybeRepair(
                      sessionId,
                      params.locale,
                      apiKey,
                      modelPrimary,
                      modelFallback,
                      contents,
                      systemInstruction,
                    );
                    const s1 = getSession(sessionId);
                    if (!s1?.text?.trim()) {
                      setError(sessionId, "empty_response");
                    } else {
                      setDone(sessionId);
                      // Persist assistant final message if conversation context available
                      try {
                        if (params.conversationId && params.convexToken) {
                          await fetchMutation(
                            api.aiMessages.addAssistantMessage,
                            {
                              conversationId:
                                params.conversationId as unknown as Id<"aiConversations">,
                              content: s1.text,
                            },
                            { token: params.convexToken },
                          );
                        }
                      } catch (err) {
                        Sentry.captureException(err);
                      }
                    }
                  })();
                },
              },
            ),
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
        return;
      } catch (err) {
        Sentry.captureException(err);
      }

      // Fallback to streaming on fallback model
      try {
        await generateWithStreaming(
          {
            model: modelFallback,
            apiKey,
            contents,
            systemInstruction,
            generationConfig: {
              temperature: 0.3,
              topP: 0.9,
              maxOutputTokens: 2048,
            },
          },
          {
            onChunkText: (t) => {
              gotChunk = true;
              appendPartial(sessionId, t);
            },
            onDone: () => {
              void (async () => {
                if (!gotChunk) {
                  try {
                    const textFallbackOnce = await generateOnce({
                      model: modelFallback,
                      apiKey,
                      contents,
                      systemInstruction,
                      generationConfig: {
                        temperature: 0.2,
                        topP: 0.9,
                        maxOutputTokens: 2048,
                      },
                    });
                    if (
                      textFallbackOnce &&
                      textFallbackOnce.trim().length > 0
                    ) {
                      appendPartial(sessionId, textFallbackOnce);
                    }
                  } catch (err) {
                    Sentry.captureException(err);
                  }
                }
                const s2 = getSession(sessionId);
                if (!s2?.text?.trim()) {
                  setError(sessionId, "empty_response");
                } else {
                  setDone(sessionId);
                  try {
                    if (params.conversationId && params.convexToken) {
                      await fetchMutation(
                        api.aiMessages.addAssistantMessage,
                        {
                          conversationId:
                            params.conversationId as unknown as Id<"aiConversations">,
                          content: s2.text,
                        },
                        { token: params.convexToken },
                      );
                    }
                  } catch (err) {
                    Sentry.captureException(err);
                  }
                }
              })();
            },
          },
        );
        return;
      } catch (err) {
        Sentry.captureException(err);
      }

      // Final fallback: non-streaming on primary, then fallback
      try {
        const text = await retryAsync(
          () =>
            generateOnce({
              model: modelPrimary,
              apiKey,
              contents,
              systemInstruction,
              generationConfig: {
                temperature: 0.3,
                topP: 0.9,
                maxOutputTokens: 2048,
              },
            }),
          {
            attempts: 3,
            onAttempt: ({ attempt, delayMs }) => {
              Sentry.addBreadcrumb({
                category: "ai.retry",
                level: "info",
                message: "generateOnce primary retry",
                data: { attempt, delayMs, model: modelPrimary },
              });
            },
          },
        );
        appendPartial(sessionId, text);
        await validateAndMaybeRepair(
          sessionId,
          params.locale,
          apiKey,
          modelPrimary,
          modelFallback,
          contents,
          systemInstruction,
        );
        setDone(sessionId);
        try {
          const s = getSession(sessionId);
          if (s?.text && params.conversationId && params.convexToken) {
            await fetchMutation(
              api.aiMessages.addAssistantMessage,
              {
                conversationId:
                  params.conversationId as unknown as Id<"aiConversations">,
                content: s.text,
              },
              { token: params.convexToken },
            );
          }
        } catch (err) {
          Sentry.captureException(err);
        }
        return;
      } catch (err) {
        Sentry.captureException(err);
      }

      try {
        const text = await retryAsync(
          () =>
            generateOnce({
              model: modelFallback,
              apiKey,
              contents,
              systemInstruction,
              generationConfig: {
                temperature: 0.3,
                topP: 0.9,
                maxOutputTokens: 2048,
              },
            }),
          {
            attempts: 3,
            onAttempt: ({ attempt, delayMs }) => {
              Sentry.addBreadcrumb({
                category: "ai.retry",
                level: "info",
                message: "generateOnce fallback retry",
                data: { attempt, delayMs, model: modelFallback },
              });
            },
          },
        );
        appendPartial(sessionId, text);
        setDone(sessionId);
        try {
          const s = getSession(sessionId);
          if (s?.text && params.conversationId && params.convexToken) {
            await fetchMutation(
              api.aiMessages.addAssistantMessage,
              {
                conversationId:
                  params.conversationId as unknown as Id<"aiConversations">,
                content: s.text,
              },
              { token: params.convexToken },
            );
          }
        } catch (err) {
          Sentry.captureException(err);
        }
        return;
      } catch (err) {
        Sentry.captureException(err);
        setError(
          sessionId,
          err instanceof Error ? err.message : "gemini_unknown_error",
        );
      }
    },
  );
}

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
  const first = detectAssessmentFromText(s.text);
  if (first.valid) return;

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

  // Ask the model to transform its prior answer into valid JSON
  const repairContents = [
    ...contents,
    { role: "model" as const, parts: [{ text: s.text.slice(-2000) }] },
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

  try {
    const text = await generateOnce({
      model: modelPrimary,
      apiKey,
      contents: repairContents,
      systemInstruction: strictInstruction,
      generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 1024 },
    });
    const second = detectAssessmentFromText(text);
    if (second.valid) {
      appendPartial(
        sessionId,
        `\n\n\u200e\n\n\`\`\`json\n${JSON.stringify(second.data)}\n\`\`\``,
      );
      Sentry.captureMessage("gemini_assessment_repaired", {
        level: "info",
        extra: { sessionId, locale },
      });
      return;
    }
  } catch (err) {
    Sentry.captureException(err);
  }

  try {
    const text = await generateOnce({
      model: modelFallback,
      apiKey,
      contents: repairContents,
      systemInstruction: strictInstruction,
      generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 1024 },
    });
    const second = detectAssessmentFromText(text);
    if (second.valid) {
      appendPartial(
        sessionId,
        `\n\n\u200e\n\n\`\`\`json\n${JSON.stringify(second.data)}\n\`\`\``,
      );
      Sentry.captureMessage("gemini_assessment_repaired_fallback", {
        level: "info",
        extra: { sessionId, locale },
      });
      return;
    }
  } catch (err) {
    Sentry.captureException(err);
  }

  Sentry.captureMessage("gemini_assessment_repair_failed", {
    level: "warning",
    extra: { sessionId, locale },
  });
}

export async function POST(req: Request): Promise<NextResponse<SendResponse>> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/chat/send" },
    async () => {
      // Basic per-IP rate limit: 10 requests per 10 seconds
      const ipKey = getClientIp(req);
      const rl = checkRateLimit(`${ipKey}:send`, 10, 10_000);
      if (!rl.allowed) {
        Sentry.captureMessage("chat_send_rate_limited", { level: "warning" });
        return NextResponse.json({ sessionId: "" } as SendResponse, {
          status: 429,
        });
      }

      // Best-effort stale session cleanup (5 minutes max age, keep up to 200 entries)
      cleanupStaleSessions(5 * 60_000, 200);

      const localeHeader = req.headers.get("x-locale");
      const locale: "ar" | "en" = localeHeader === "ar" ? "ar" : "en";

      const parsed = SendRequestSchema.safeParse(await req.json());
      if (!parsed.success) {
        return NextResponse.json({ sessionId: "" } as SendResponse, {
          status: 400,
        });
      }

      const session = createSession();

      // Prepare Convex auth token and create/reuse conversation, persist user message
      let conversationId: string | null = null;
      let token: string | null = null;
      let systemPrompt: string | null = null;
      try {
        token = (await convexAuthNextjsToken()) ?? null;
        // Build dynamic system prompt (non-blocking if it fails, we fallback inside generator)
        try {
          const built = await buildSystemPrompt({
            aiSkillId: parsed.data.skillId,
            locale,
            convexToken: token,
          });
          systemPrompt = built.systemPrompt;
        } catch (err) {
          Sentry.captureException(err);
        }
        if (token) {
          const convoRes = await fetchMutation(
            api.aiConversations.createOrGetActive,
            {
              aiSkillId: parsed.data.skillId as unknown as Id<"aiSkills">,
              language: locale,
              systemPrompt: systemPrompt ?? undefined,
            },
            { token },
          );
          if (convoRes?.conversationId) {
            conversationId = convoRes.conversationId as unknown as string;
            // Save user message
            await fetchMutation(
              api.aiMessages.addUserMessage,
              {
                conversationId:
                  conversationId as unknown as Id<"aiConversations">,
                content: parsed.data.message,
              },
              { token },
            );
          }
        }
      } catch (err) {
        // Non-blocking: continue streaming even if persistence fails
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
      });
      return NextResponse.json({
        sessionId: session.sessionId,
        conversationId,
      });
    },
  );
}
