"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { SkillSelect } from "@/components/ai/SkillSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ChatConfigState {
  readonly aiSkillId?: Id<"aiSkills">;
  readonly preferredLanguage: "ar" | "en";
}

export default function YouthLearningPage(): ReactElement {
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "ar" ? "ar" : "en";
  const t = useTranslations("learning");
  const tc = useTranslations("common");
  const router = useRouter();

  const config = useQuery(api.aiChatConfigs.getMyChatConfig, {});
  const upsert = useMutation(api.aiChatConfigs.upsertMyChatConfig);

  type ChatConfigResult = {
    readonly _id?: Id<"aiChatConfigs">;
    readonly userId: Id<"appUsers">;
    readonly aiSkillId?: Id<"aiSkills">;
    readonly preferredLanguage: "ar" | "en";
    readonly createdAt?: number;
    readonly updatedAt?: number;
  } | null;

  const [state, setState] = useState<ChatConfigState | undefined>(undefined);
  const isLoading = config === undefined;

  useEffect(() => {
    if (config === undefined) return;
    const value = config as ChatConfigResult;
    if (value === null) {
      setState({ preferredLanguage: locale });
      return;
    }
    setState({
      aiSkillId: value.aiSkillId,
      preferredLanguage: value.preferredLanguage ?? locale,
    });
  }, [config, locale]);

  const onSave = useCallback(async () => {
    if (!state) return;
    await upsert({
      aiSkillId: state.aiSkillId,
      preferredLanguage: state.preferredLanguage,
    });
  }, [state, upsert]);

  const onStartAssessment = useCallback(async () => {
    if (!state?.aiSkillId) return;
    // Persist latest selections (non-blocking for UX but awaited to avoid race)
    await upsert({
      aiSkillId: state.aiSkillId,
      preferredLanguage: state.preferredLanguage,
    });
    const skillId = state.aiSkillId as unknown as string;
    router.push(
      `/${locale}/learning/chat?skill=${encodeURIComponent(skillId)}`,
    );
  }, [locale, router, state, upsert]);

  const title = useMemo(() => t("title"), [t]);

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <h1 className="text-foreground mb-6 text-2xl font-bold">{title}</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">{t("settingsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>{t("skillLabel")}</Label>
              <SkillSelect
                className="w-full"
                value={state?.aiSkillId}
                onChange={({ value }) =>
                  setState((prev) => ({
                    ...(prev ?? { preferredLanguage: locale }),
                    aiSkillId: value,
                  }))
                }
                placeholder={t("skillPlaceholder")}
              />
              <p className="text-muted-foreground text-xs">{t("skillHelp")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("chatLanguageLabel")}</Label>
              <Select
                value={state?.preferredLanguage}
                onValueChange={(val) =>
                  setState((prev) => ({
                    ...(prev ?? { preferredLanguage: locale }),
                    preferredLanguage: val as "ar" | "en",
                  }))
                }
                disabled={isLoading}
                dir={locale === "ar" ? "rtl" : "ltr"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("languagePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{tc("arabic")}</SelectItem>
                  <SelectItem value="en">{tc("english")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {t("languageHint")}
              </p>
            </div>

            <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-2 sm:flex-row sm:items-center">
              <Button variant="secondary" onClick={onSave} disabled={isLoading}>
                {t("save")}
              </Button>
              <Button
                onClick={onStartAssessment}
                disabled={isLoading || !state?.aiSkillId}
              >
                {t("startAssessment")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("learningPathTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {t("learningPathHint")}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
