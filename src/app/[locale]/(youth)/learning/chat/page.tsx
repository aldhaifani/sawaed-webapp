"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAiChatInit } from "@/hooks/use-ai-chat-init";
import type { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { TypingLoader } from "@/components/ui/loader";
import { usePersistedTranscript } from "@/hooks/usePersistedTranscript";
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
import { ResponseStream } from "@/components/ui/response-stream";
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
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);

  const skillParam = params.get("skill") ?? "";
  const skillId = skillParam as unknown as Id<"aiSkills">;
  const { load: loadTranscript, save: saveTranscript } = usePersistedTranscript(
    skillParam || undefined,
  );

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
    const existing = loadTranscript();
    if (existing.length > 0) {
      setMessages(existing);
    }
    // don't include loadTranscript as dependency to avoid re-load loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, skillParam]);

  // Persist transcript on every change
  useEffect(() => {
    saveTranscript(messages);
  }, [messages, saveTranscript]);

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
                          <ResponseStream
                            textStream={m.content}
                            mode="typewriter"
                            speed={24}
                            className="break-words whitespace-pre-wrap"
                            onComplete={() => {
                              // Once streaming finishes, re-render this message with Markdown
                              setMessages((prev) =>
                                prev.map((msg) =>
                                  msg.id === m.id
                                    ? { ...msg, streaming: false }
                                    : msg,
                                ),
                              );
                            }}
                          />
                        ) : m.error ? (
                          <div className="space-y-2">
                            <p className="text-[16px] leading-6 break-words whitespace-pre-wrap md:text-[15px]">
                              {m.content}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  // Retry with last user message content
                                  const lastUser = [...messages]
                                    .reverse()
                                    .find((mm) => mm.role === "user");
                                  if (!lastUser) return;
                                  setIsAiTyping(true);
                                  // Dummy retry path uses same mock response
                                  const aiText =
                                    locale === "ar"
                                      ? "تمت إعادة المحاولة بنجاح."
                                      : "Retry succeeded.";
                                  window.setTimeout(() => {
                                    setIsAiTyping(false);
                                    const aiMsg: Message = {
                                      id: `a-${Date.now()}`,
                                      role: "ai",
                                      content: aiText,
                                      streaming: false,
                                      createdAt: Date.now(),
                                    };
                                    setMessages((prev) => [...prev, aiMsg]);
                                  }, 400);
                                }}
                              >
                                {locale === "ar" ? "إعادة المحاولة" : "Retry"}
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

              {isAiTyping && (
                <div className="flex w-full justify-start">
                  <div
                    className="bg-muted text-foreground w-fit max-w-[75%] rounded-2xl px-4 py-2"
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  >
                    <div aria-live="polite" aria-atomic="true">
                      <TypingLoader size="md" />
                      <span className="sr-only">
                        {locale === "ar"
                          ? "المساعد يكتب"
                          : "Assistant is typing"}
                      </span>
                    </div>
                    <div className="text-foreground/70 mt-1 text-xs">
                      {senderLabels.ai} •{" "}
                      {locale === "ar" ? "يكتب…" : "typing…"}
                    </div>
                  </div>
                </div>
              )}

              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainerRoot>
        </div>

        {/* Footer input like ChatGPT */}
        <div className="sticky bottom-0 z-10 mx-auto w-full max-w-3xl py-4">
          <div className="bg-card rounded-xl border p-2 shadow-sm">
            {/* Define one submit function to reuse for Enter and button click */}
            <PromptInput
              value={input}
              onValueChange={setInput}
              onSubmit={() => {
                const trimmed = input.trim();
                if (!trimmed) return;
                const userMsg: Message = {
                  id: `u-${Date.now()}`,
                  role: "user",
                  content: trimmed,
                  createdAt: Date.now(),
                };
                setMessages((prev) => [...prev, userMsg]);
                setInput("");

                setIsAiTyping(true);
                const aiText =
                  locale === "ar"
                    ? "## مثال ماركداون\n\n- عنصر أول\n- عنصر ثانٍ\n\n```ts\nfunction greet(name: string): string {\n  return `مرحبا، ${name}`;\n}\n```\n\n> تذكير: هذا رد تجريبي للتأكد من دعم الـ Markdown."
                    : "## Markdown Example\n\n- First item\n- Second item\n\n```ts\nfunction greet(name: string): string {\n  return `Hello, ${name}`;\n}\n```\n\n> Note: This is a dummy reply to verify Markdown rendering.";

                window.setTimeout(() => {
                  setIsAiTyping(false);
                  const aiMsg: Message = {
                    id: `a-${Date.now()}`,
                    role: "ai",
                    content: aiText,
                    streaming: false,
                    createdAt: Date.now(),
                  };
                  setMessages((prev) => [...prev, aiMsg]);
                  focusInput();
                }, 400);
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
                      onClick={() => {
                        const trimmed = input.trim();
                        if (!trimmed) return;
                        // Reuse the same logic by triggering onSubmit through key path
                        // Simpler: duplicate minimal logic for clarity
                        const userMsg: Message = {
                          id: `u-${Date.now()}`,
                          role: "user",
                          content: trimmed,
                          createdAt: Date.now(),
                        };
                        setMessages((prev) => [...prev, userMsg]);
                        setInput("");

                        setIsAiTyping(true);
                        const aiText =
                          locale === "ar"
                            ? "## مثال ماركداون\n\n- عنصر أول\n- عنصر ثانٍ\n\n```ts\nfunction greet(name: string): string {\n  return `مرحبا، ${name}`;\n}\n```\n\n> تذكير: هذا رد تجريبي للتأكد من دعم الـ Markdown."
                            : "## Markdown Example\n\n- First item\n- Second item\n\n```ts\nfunction greet(name: string): string {\n  return `Hello, ${name}`;\n}\n```\n\n> Note: This is a dummy reply to verify Markdown rendering.";
                        window.setTimeout(() => {
                          setIsAiTyping(false);
                          const aiMsg: Message = {
                            id: `a-${Date.now()}`,
                            role: "ai",
                            content: aiText,
                            streaming: false,
                            createdAt: Date.now(),
                          };
                          setMessages((prev) => [...prev, aiMsg]);
                          focusInput();
                        }, 400);
                      }}
                      disabled={!input.trim()}
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
