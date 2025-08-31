"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAiChatInit } from "@/hooks/use-ai-chat-init";
import type { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { DotStream } from "ldrs/react";
import "ldrs/react/DotStream.css";
import { usePersistedTranscript } from "@/hooks/usePersistedTranscript";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { detectAssessmentFromText } from "@/shared/ai/detect-assessment";
import { useChatStatusPoll } from "@/hooks/use-chat-status-poll";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import { Send } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";

/**
 * Assessment Chat bootstrap page
 * - Reads ?skill= param
 * - Calls useAiChatInit().init to prefetch latest assessment/path context
 * - Renders loading, error, and ready states. The actual chat UI will be added later.
 */
type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  streaming?: boolean;
  createdAt: number;
  error?: boolean;
};

export default function ChatInitPage(): ReactElement {
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "ar" ? "ar" : "en";
  const t = useTranslations("chat");
  const params = useSearchParams();
  const router = useRouter();
  const { init, isLoading, error, data } = useAiChatInit();
  const [booted, setBooted] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [conversationId, setConversationId] =
    useState<Id<"aiConversations"> | null>(null);
  // Typing state removed; we render a loader inside the AI message bubble instead
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "reconnecting" | "disconnected" | null
  >(null);
  const [isAssessmentComplete, setIsAssessmentComplete] =
    useState<boolean>(false);
  const [isProcessingAssessment, setIsProcessingAssessment] =
    useState<boolean>(false);

  const skillParam = params.get("skill") ?? "";
  const skillId = skillParam as unknown as Id<"aiSkills">;
  const { load: loadTranscript, save: saveTranscript } = usePersistedTranscript(
    skillParam || undefined,
  );
  const storeAssessment = useMutation(api.aiAssessments.storeAssessment);
  const sessionStorageKey = useMemo(
    () => `chatSession:${skillParam}`,
    [skillParam],
  );
  const conversationStorageKey = useMemo(
    () => `chatConversation:${skillParam}`,
    [skillParam],
  );
  const hasPersistedRef = useRef<boolean>(false);

  const { startPolling, stopPolling, sendMessage } = useChatStatusPoll({
    onProgress: ({ aiMessageId, text, status, progressed }) => {
      setConnectionState("connected");
      if (progressed) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content: text,
                  streaming: status !== "done" && status !== "error",
                }
              : m,
          ),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  streaming: status !== "done" && status !== "error",
                }
              : m,
          ),
        );
      }
    },
    onDone: ({
      aiMessageId: _aiMessageId,
      text,
    }: {
      aiMessageId: string;
      text: string;
    }) => {
      // Only check for assessment JSON if the message explicitly contains a JSON code block
      if (!hasPersistedRef.current && text.includes("```json")) {
        void (async () => {
          try {
            setIsProcessingAssessment(true);

            const detected = detectAssessmentFromText(text);
            if (detected.valid && detected.data && skillParam) {
              await storeAssessment({
                aiSkillId: skillId,
                result: detected.data,
              });
              hasPersistedRef.current = true;
              setIsAssessmentComplete(true);
              setIsProcessingAssessment(false);

              toast.success(
                (() => {
                  try {
                    return t("assessmentComplete");
                  } catch {
                    return locale === "ar"
                      ? "اكتمل التقييم"
                      : "Assessment complete";
                  }
                })(),
              );
            } else {
              // Only show error if JSON was explicitly sent but invalid
              setIsProcessingAssessment(false);
              console.warn("Invalid assessment JSON structure");
              toast.error(
                (() => {
                  try {
                    return t("assessmentFailed");
                  } catch {
                    return locale === "ar"
                      ? "تعذّر إكمال التقييم. يرجى المحاولة مرة أخرى."
                      : "Assessment could not be completed. Please try again.";
                  }
                })(),
              );
            }
          } catch (e) {
            setIsProcessingAssessment(false);
            Sentry.captureException(e);
          }
        })();
      }
      try {
        window.localStorage.removeItem(sessionStorageKey);
      } catch {}
      setConnectionState(null);
    },
    onError: () => {
      toast(t("errorLoading"));
      try {
        window.localStorage.removeItem(sessionStorageKey);
      } catch {}
      setConnectionState("disconnected");
    },
  });

  // Prevent double auto-starts
  const autoStartedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!skillParam) return;
    void Sentry.startSpan(
      { op: "ai.chat", name: "Chat Page Init" },
      async () => {
        const res = await init(skillId);
        if (!res) toast.error(t("errorLoading"));
        setBooted(true);
      },
    );
  }, [init, skillId, skillParam, t]);

  // Load persisted transcript once booted and when skill changes
  useEffect(() => {
    if (!booted || !skillParam) return;
    // Load known conversationId if any
    try {
      const cid = window.localStorage.getItem(conversationStorageKey);
      if (cid) setConversationId(cid as unknown as Id<"aiConversations">);
    } catch {}
    const existing = loadTranscript();
    if (existing.length > 0) {
      setMessages(existing);
    }
    // don't include loadTranscript as dependency to avoid re-load loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, skillParam]);

  // Auto-start greeting when no history exists
  useEffect(() => {
    if (!booted || !skillParam) return;
    if (autoStartedRef.current) return;
    if (messages.length > 0) return;
    // Create AI placeholder and trigger send
    const aiMsg: Message = {
      id: `a-${Date.now()}`,
      role: "ai",
      content: "",
      streaming: true,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    void (async () => {
      const result = await sendMessage({
        skillId: skillParam,
        message: "__start__",
        locale,
      });
      if (!result) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? {
                  ...m,
                  content: t("errorLoading"),
                  streaming: false,
                  error: true,
                }
              : m,
          ),
        );
        toast(t("errorLoading"));
        return;
      }
      const { sessionId, conversationId: nextConversationId } = result;
      if (nextConversationId) {
        setConversationId(
          nextConversationId as unknown as Id<"aiConversations">,
        );
        try {
          window.localStorage.setItem(
            conversationStorageKey,
            nextConversationId,
          );
        } catch {}
      }
      try {
        window.localStorage.setItem(
          sessionStorageKey,
          JSON.stringify({
            sessionId,
            aiMessageId: aiMsg.id,
            conversationId: nextConversationId ?? null,
          }),
        );
      } catch {}
      hasPersistedRef.current = false;
      startPolling({ sessionId, aiMessageId: aiMsg.id });
      autoStartedRef.current = true;
    })();
    // Only run once on initial empty state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, skillParam, messages.length]);

  // Resume in-flight polling session on reload (if any)
  useEffect(() => {
    if (!booted || !skillParam) return;
    try {
      const raw = window.localStorage.getItem(sessionStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        sessionId: string;
        aiMessageId: string;
        conversationId?: string | null;
      } | null;
      if (!parsed?.sessionId || !parsed.aiMessageId) return;
      if (parsed.conversationId) {
        setConversationId(
          parsed.conversationId as unknown as Id<"aiConversations">,
        );
        try {
          window.localStorage.setItem(
            conversationStorageKey,
            parsed.conversationId,
          );
        } catch {}
      }
      const exists = messages.some((m) => m.id === parsed.aiMessageId);
      if (!exists) {
        const aiMsg: Message = {
          id: parsed.aiMessageId,
          role: "ai",
          content: "",
          streaming: true,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
      hasPersistedRef.current = false;
      startPolling({
        sessionId: parsed.sessionId,
        aiMessageId: parsed.aiMessageId,
      });
    } catch {}
    // We intentionally omit dependencies like pollStatus to avoid re-running unexpectedly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, skillParam, sessionStorageKey]);

  // Cleanup on unmount via hook
  useEffect(() => {
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist transcript on every change
  useEffect(() => {
    saveTranscript(messages);
  }, [messages, saveTranscript]);

  // Load message history from Convex when we have a conversationId and no in-memory messages
  const history = useQuery(
    api.aiMessages.listByConversation,
    conversationId ? { conversationId } : "skip",
  );
  useEffect(() => {
    if (!conversationId) return;
    if (!history) return; // loading or skipped
    if (history.length === 0) return;
    // Hydrate if we have no real history yet or only a placeholder AI bubble
    setMessages((prev) => {
      const first = prev[0];
      const onlyPlaceholder =
        prev.length === 1 && first?.role === "ai" && first?.streaming === true;
      if (prev.length > 0 && !onlyPlaceholder) return prev;
      const mapped: Message[] = history.map((m) => ({
        id: m._id,
        role: m.role === "assistant" ? "ai" : "user",
        content: m.content,
        streaming: false,
        createdAt: m.createdAt,
      }));
      return mapped;
    });
  }, [conversationId, history]);

  const title = useMemo(() => t("title"), [t]);
  const senderLabels = useMemo(
    () => ({
      user: locale === "ar" ? "أنت" : "You",
      ai: locale === "ar" ? "المساعد" : "Assistant",
    }),
    [locale],
  );
  const emptyHintText = useMemo(() => {
    const fallback =
      locale === "ar"
        ? "ابدأ المحادثة بطرح سؤالك. يدعم الردود العربية والإنجليزية."
        : "Start the conversation by asking a question. Arabic and English are supported.";
    try {
      const v = t("emptyHint");
      return typeof v === "string" ? v : fallback;
    } catch {
      return fallback;
    }
  }, [t, locale]);
  const footerDisclaimerText = useMemo(() => {
    const fallback =
      locale === "ar"
        ? "قد تحتوي الردود على أخطاء. تأكد دائمًا من المعلومات الهامة."
        : "AI responses may contain mistakes. Always verify important information.";
    try {
      const v = t("footerDisclaimer");
      return typeof v === "string" ? v : fallback;
    } catch {
      return fallback;
    }
  }, [t, locale]);
  const formatTime = (ts: number): string => {
    try {
      return new Date(ts).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Polling utilities moved into useChatStatusPoll hook

  // Keep focus in the textarea after sending
  const focusInput = (): void => {
    const el = document.getElementById(
      "chat-input",
    ) as HTMLTextAreaElement | null;
    el?.focus();
  };

  return (
    <main className="bg-background min-h-[calc(100vh-56px)] w-full">
      {/* Top bar fixed so it never scrolls away */}
      <header className="fixed inset-x-0 top-[52px] z-40 w-full border-b px-4">
        {/* Full-width blur/background overlay */}
        <div
          aria-hidden
          className="bg-background/70 supports-[backdrop-filter]:bg-background/70 pointer-events-none absolute inset-0 backdrop-blur"
        />
        <div className="relative mx-auto flex max-w-3xl items-center justify-between bg-transparent py-3">
          <h1 className="text-foreground text-lg font-semibold">{title}</h1>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.replace(`/${locale}/learning`)}
          >
            {t("backToSettings")}
          </Button>
        </div>
      </header>

      {/* Content area */}
      <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-3xl flex-col px-4 pt-16">
        {/* Status banners */}
        {!skillParam && (
          <p className="text-destructive mx-auto mt-3 text-sm">
            {t("missingSkill")}
          </p>
        )}
        {isProcessingAssessment && (
          <div className="mx-auto mt-3 w-full max-w-3xl rounded-md border bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-200">
            {(() => {
              try {
                return t("assessmentProcessing");
              } catch {
                return locale === "ar"
                  ? "جارٍ معالجة نتائج التقييم..."
                  : "Processing your assessment results...";
              }
            })()}
          </div>
        )}
        {isAssessmentComplete && (
          <div className="mx-auto mt-3 w-full max-w-3xl rounded-md border bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-200">
            {(() => {
              try {
                return t("assessmentComplete");
              } catch {
                return locale === "ar"
                  ? "تم اكتمال التقييم"
                  : "Assessment complete";
              }
            })()}
          </div>
        )}
        {isLoading && (
          <p className="text-muted-foreground mx-auto mt-3 text-sm">
            {t("loading")}
          </p>
        )}
        {error && (
          <p className="text-destructive mx-auto mt-3 text-sm">
            {t("errorLoading")}
          </p>
        )}
        {connectionState && (
          <p
            className="text-muted-foreground mx-auto mt-2 text-xs"
            aria-live="polite"
          >
            {(() => {
              try {
                return t(`connectionState.${connectionState}`);
              } catch {
                // Fallback short strings if i18n keys are missing
                switch (connectionState) {
                  case "connecting":
                    return locale === "ar"
                      ? "جارٍ الاتصال..."
                      : "Connecting...";
                  case "connected":
                    return locale === "ar" ? "متصل" : "Connected";
                  case "reconnecting":
                    return locale === "ar"
                      ? "إعادة الاتصال..."
                      : "Reconnecting...";
                  case "disconnected":
                    return locale === "ar" ? "انقطع الاتصال" : "Disconnected";
                  default:
                    return "";
                }
              }
            })()}
          </p>
        )}
        {/* Context line */}
        {booted && data && (
          <div className="text-muted-foreground mx-auto my-3 text-xs">
            {t("skill")}{" "}
            {locale === "ar" ? data.aiSkill.nameAr : data.aiSkill.nameEn}
            {data.latestAssessment
              ? ` • ${t("lastLevel")} ${data.latestAssessment.level}`
              : ""}
          </div>
        )}

        {/* Messages */}
        <div className="flex min-h-0 flex-1 flex-col py-4">
          <ChatContainerRoot className="flex-1" aria-relevant="additions">
            <ChatContainerContent
              className="space-y-3 p-0 pb-24 md:space-y-2"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <p className="text-muted-foreground mx-auto max-w-prose text-center text-base md:text-sm">
                  {emptyHintText}
                </p>
              )}

              {messages.map((m, idx) => {
                const prev = messages[idx - 1];
                const next = messages[idx + 1];
                const isStartOfGroup = !prev || prev.role !== m.role;
                const isEndOfGroup = !next || next.role !== m.role;
                return (
                  <div
                    key={m.id}
                    className={
                      m.role === "user"
                        ? "flex w-full justify-end"
                        : "flex w-full justify-start"
                    }
                  >
                    <div
                      className={
                        (m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : m.error
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-foreground") +
                        " w-fit max-w-[75%] rounded-2xl px-4 py-2 md:py-2.5" +
                        (isStartOfGroup ? " mt-1" : " mt-0")
                      }
                      dir={locale === "ar" ? "rtl" : "ltr"}
                    >
                      <span className="sr-only">{senderLabels[m.role]}: </span>
                      {m.role === "ai" ? (
                        m.streaming ? (
                          <div className="flex items-center gap-2">
                            <DotStream
                              size="50"
                              speed="2"
                              color="currentColor"
                            />
                            <span className="text-sm opacity-75">
                              {locale === "ar"
                                ? "المساعد يفكر ويكتب..."
                                : "AI is thinking and writing..."}
                            </span>
                            <span className="sr-only">
                              {locale === "ar"
                                ? "المساعد يكتب"
                                : "Assistant is typing"}
                            </span>
                          </div>
                        ) : m.error ? (
                          <div className="space-y-2">
                            <p className="text-[16px] leading-6 break-words whitespace-pre-wrap md:text-[15px]">
                              {m.content}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={async () => {
                                  // Retry with last user message content
                                  const lastUser = [...messages]
                                    .reverse()
                                    .find((mm) => mm.role === "user");
                                  if (!lastUser || !data?.aiSkill?._id) return;

                                  // Remove the error message
                                  setMessages((prev) =>
                                    prev.filter((msg) => msg.id !== m.id),
                                  );

                                  // Resend the message
                                  try {
                                    const result = await sendMessage({
                                      skillId: data.aiSkill._id,
                                      message: lastUser.content,
                                      locale,
                                    });
                                    if (result) {
                                      startPolling({
                                        sessionId: result.sessionId,
                                        aiMessageId: `ai-${Date.now()}`,
                                      });
                                    }
                                  } catch (error) {
                                    console.error("Retry failed:", error);
                                  }
                                }}
                              >
                                {locale === "ar" ? "إعادة المحاولة" : "Retry"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Clear error and continue
                                  setMessages((prev) =>
                                    prev.filter((msg) => msg.id !== m.id),
                                  );
                                }}
                              >
                                {locale === "ar" ? "تجاهل" : "Dismiss"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div dir={locale === "ar" ? "rtl" : "ltr"}>
                            <Markdown
                              className={
                                `${
                                  locale === "ar" ? "text-right" : ""
                                } prose prose-base md:prose-sm lg:prose-base dark:prose-invert text-foreground max-w-none leading-6 break-words whitespace-pre-wrap ` +
                                "prose-headings:my-1 prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-blockquote:my-2 prose-pre:my-2" +
                                (locale === "ar"
                                  ? "[&_ol]:pe-5 [&_ul]:pe-5"
                                  : "[&_ol]:ps-5 [&_ul]:ps-5")
                              }
                            >
                              {m.content}
                            </Markdown>
                          </div>
                        )
                      ) : (
                        <span className="text-[16px] leading-6 break-words whitespace-pre-wrap md:text-[15px]">
                          {m.content}
                        </span>
                      )}
                      {isEndOfGroup && (
                        <div className="text-foreground/70 mt-1 text-[11px] md:text-xs">
                          {senderLabels[m.role]} • {formatTime(m.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Removed separate typing bubble; loader is shown within the AI message bubble while streaming */}

              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainerRoot>
        </div>

        {/* Footer input like ChatGPT */}
        <div className="bg-background/70 supports-[backdrop-filter]:bg-background/70 sticky bottom-0 z-10 mx-auto w-full max-w-3xl rounded-t-2xl pb-4 backdrop-blur">
          <div className="bg-card rounded-xl border p-2 shadow-sm">
            {/* Show processing indicator in input area */}
            {isProcessingAssessment && (
              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                {(() => {
                  try {
                    return t("jsonDetecting");
                  } catch {
                    return locale === "ar"
                      ? "جارٍ تحليل إجاباتك..."
                      : "Analyzing your responses...";
                  }
                })()}
              </div>
            )}
            {/* Define one submit function to reuse for Enter and button click */}
            <PromptInput
              value={input}
              onValueChange={setInput}
              onSubmit={async () => {
                const trimmed = input.trim();
                if (
                  !trimmed ||
                  !skillParam ||
                  isProcessingAssessment ||
                  isAssessmentComplete
                )
                  return;
                const userMsg: Message = {
                  id: `u-${Date.now()}`,
                  role: "user",
                  content: trimmed,
                  createdAt: Date.now(),
                };
                setMessages((prev) => [...prev, userMsg]);
                setInput("");

                // Placeholder AI message that will be progressively updated
                const aiMsg: Message = {
                  id: `a-${Date.now()}`,
                  role: "ai",
                  content: "",
                  streaming: true,
                  createdAt: Date.now(),
                };
                setMessages((prev) => [...prev, aiMsg]);

                const result = await sendMessage({
                  skillId: skillParam,
                  message: trimmed,
                  locale,
                });
                if (!result) {
                  // mark AI message as error
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsg.id
                        ? {
                            ...m,
                            content: t("errorLoading"),
                            streaming: false,
                            error: true,
                          }
                        : m,
                    ),
                  );
                  toast(t("errorLoading"));
                  return;
                }
                const { sessionId, conversationId: nextConversationId } =
                  result;
                if (nextConversationId) {
                  setConversationId(
                    nextConversationId as unknown as Id<"aiConversations">,
                  );
                  try {
                    window.localStorage.setItem(
                      conversationStorageKey,
                      nextConversationId,
                    );
                  } catch {}
                }
                try {
                  window.localStorage.setItem(
                    sessionStorageKey,
                    JSON.stringify({
                      sessionId,
                      aiMessageId: aiMsg.id,
                      conversationId: nextConversationId ?? null,
                    }),
                  );
                } catch {}
                hasPersistedRef.current = false;
                startPolling({ sessionId, aiMessageId: aiMsg.id });
                focusInput();
              }}
              className="bg-transparent p-0 shadow-none"
            >
              <div
                className="flex items-end gap-2"
                dir={locale === "ar" ? "rtl" : "ltr"}
              >
                <div className="flex-1">
                  <PromptInputTextarea
                    id="chat-input"
                    placeholder={
                      locale === "ar"
                        ? "اكتب رسالتك..."
                        : "Type your message..."
                    }
                    aria-label={
                      locale === "ar" ? "اكتب رسالة" : "Type a message"
                    }
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    autoFocus
                    className="text-[16px] leading-6 md:text-[15px]"
                  />
                </div>
                <PromptInputActions className="p-1">
                  <PromptInputAction
                    tooltip={locale === "ar" ? "إرسال" : "Send"}
                  >
                    <Button
                      type="button"
                      size="icon"
                      className="rounded-full"
                      onClick={async () => {
                        const trimmed = input.trim();
                        if (
                          !trimmed ||
                          !skillParam ||
                          isProcessingAssessment ||
                          isAssessmentComplete
                        )
                          return;
                        const userMsg: Message = {
                          id: `u-${Date.now()}`,
                          role: "user",
                          content: trimmed,
                          createdAt: Date.now(),
                        };
                        setMessages((prev) => [...prev, userMsg]);
                        setInput("");

                        const aiMsg: Message = {
                          id: `a-${Date.now()}`,
                          role: "ai",
                          content: "",
                          streaming: true,
                          createdAt: Date.now(),
                        };
                        setMessages((prev) => [...prev, aiMsg]);

                        const result = await sendMessage({
                          skillId: skillParam,
                          message: trimmed,
                          locale,
                        });
                        if (!result) {
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === aiMsg.id
                                ? {
                                    ...m,
                                    content: t("errorLoading"),
                                    streaming: false,
                                    error: true,
                                  }
                                : m,
                            ),
                          );
                          toast(t("errorLoading"));
                          return;
                        }
                        const {
                          sessionId,
                          conversationId: nextConversationId,
                        } = result;
                        if (nextConversationId) {
                          setConversationId(
                            nextConversationId as unknown as Id<"aiConversations">,
                          );
                          try {
                            window.localStorage.setItem(
                              conversationStorageKey,
                              nextConversationId,
                            );
                          } catch {}
                        }
                        try {
                          window.localStorage.setItem(
                            sessionStorageKey,
                            JSON.stringify({
                              sessionId,
                              aiMessageId: aiMsg.id,
                              conversationId: nextConversationId ?? null,
                            }),
                          );
                        } catch {}
                        hasPersistedRef.current = false;
                        startPolling({ sessionId, aiMessageId: aiMsg.id });
                        focusInput();
                      }}
                      disabled={
                        !input.trim() ||
                        isProcessingAssessment ||
                        isAssessmentComplete
                      }
                    >
                      <Send className="h-4 w-4" />
                      <span className="sr-only">
                        {locale === "ar" ? "إرسال" : "Send"}
                      </span>
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </div>
            </PromptInput>
          </div>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            {footerDisclaimerText}
          </p>
        </div>
      </section>
    </main>
  );
}
