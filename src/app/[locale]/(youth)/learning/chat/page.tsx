"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAiChatInit } from "@/hooks/use-ai-chat-init";
import type { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

/**
 * Assessment Chat bootstrap page
 * - Reads ?skill= param
 * - Calls useAiChatInit().init to prefetch latest assessment/path context
 * - Renders loading, error, and ready states. The actual chat UI will be added later.
 */
export default function ChatInitPage(): ReactElement {
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "ar" ? "ar" : "en";
  const t = useTranslations("chat");
  const params = useSearchParams();
  const router = useRouter();
  const { init, isLoading, error, data } = useAiChatInit();
  const [booted, setBooted] = useState<boolean>(false);

  const skillParam = params.get("skill") ?? "";
  const skillId = skillParam as unknown as Id<"aiSkills">;

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

  const title = useMemo(() => t("title"), [t]);

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <h1 className="text-foreground mb-6 text-2xl font-bold">{title}</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("initTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!skillParam && (
              <p className="text-destructive text-sm">{t("missingSkill")}</p>
            )}

            {isLoading && (
              <div className="text-muted-foreground text-sm">
                {t("loading")}
              </div>
            )}

            {error && (
              <div className="text-destructive text-sm">
                {t("errorLoading")}
              </div>
            )}

            {booted && data && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">{t("skill")}</span>{" "}
                  <span className="font-medium">
                    {locale === "ar"
                      ? data.aiSkill.nameAr
                      : data.aiSkill.nameEn}
                  </span>
                </div>
                {data.latestAssessment && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {t("lastLevel")}
                    </span>{" "}
                    <span className="font-medium">
                      {data.latestAssessment.level}
                    </span>
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    onClick={
                      () => router.replace(`/${locale}/learning`) // Placeholder action for now
                    }
                  >
                    {t("backToSettings")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
