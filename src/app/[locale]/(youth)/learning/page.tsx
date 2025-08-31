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
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { useAiChatInit } from "@/hooks/use-ai-chat-init";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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
  const { init: initAssessment } = useAiChatInit();

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

  const [saving, setSaving] = useState<boolean>(false);
  const onSave = useCallback(async () => {
    if (!state) return;
    await Sentry.startSpan(
      { op: "ai.config", name: "Save AI Chat Config" },
      async () => {
        try {
          setSaving(true);
          await upsert({
            aiSkillId: state.aiSkillId,
            preferredLanguage: state.preferredLanguage,
          });
          toast.success(t("saveSuccess"));
        } catch (err) {
          const e = err as Error;
          Sentry.captureException(e, {
            tags: { area: "ai", action: "saveConfig" },
          });
          toast.error(t("saveError"));
        } finally {
          setSaving(false);
        }
      },
    );
  }, [state, t, upsert]);

  const [starting, setStarting] = useState<boolean>(false);
  const onStartAssessment = useCallback(async () => {
    if (!state?.aiSkillId) return;
    await Sentry.startSpan(
      { op: "ai.start", name: "Start Assessment Flow" },
      async () => {
        try {
          setStarting(true);
          await upsert({
            aiSkillId: state.aiSkillId,
            preferredLanguage: state.preferredLanguage,
          });
          const res = await initAssessment(state.aiSkillId!);
          if (!res) {
            toast.error(t("startInitFailed"));
            return;
          }
          const skillId = String(state.aiSkillId);
          router.push(
            `/${locale}/learning/chat?skill=${encodeURIComponent(skillId)}`,
          );
        } catch (err) {
          const e = err as Error;
          Sentry.captureException(e, { tags: { area: "ai", action: "start" } });
          toast.error(t("startErrorGeneric"));
        } finally {
          setStarting(false);
        }
      },
    );
  }, [initAssessment, locale, router, state, t, upsert]);

  const title = useMemo(() => t("title"), [t]);

  // Learning Path query
  const learningPath = useQuery(
    api.aiAssessments.getLearningPath,
    state?.aiSkillId ? { aiSkillId: state.aiSkillId } : "skip",
  );

  type Module = {
    readonly id: string;
    readonly title: string;
    readonly type: string;
    readonly duration?: number | null;
  };
  type LearningPath =
    | {
        readonly _id: Id<"aiLearningPaths">;
        readonly modules: readonly Module[];
        readonly status: "active" | "completed" | "archived";
        readonly completedModuleIds: readonly string[];
        readonly createdAt: number;
        readonly updatedAt?: number;
      }
    | undefined;

  const pathData = learningPath as LearningPath;
  const [optimisticCompleted, setOptimisticCompleted] = useState<
    readonly string[] | null
  >(null);
  const [optimisticStatus, setOptimisticStatus] = useState<
    "active" | "completed" | null
  >(null);

  // Reset optimistic state when path changes
  useEffect(() => {
    if (!pathData) {
      setOptimisticCompleted(null);
      setOptimisticStatus(null);
      return;
    }
    setOptimisticCompleted(pathData.completedModuleIds);
    setOptimisticStatus(
      pathData.status === "completed" ? "completed" : "active",
    );
  }, [pathData]);

  const markCompleted = useMutation(api.aiAssessments.markModuleCompleted);
  const markIncomplete = useMutation(api.aiAssessments.markModuleIncomplete);

  const onToggleModule = useCallback(
    async (moduleId: string, checked: boolean) => {
      if (!pathData) return;
      const current = new Set<string>(
        optimisticCompleted ?? pathData.completedModuleIds ?? [],
      );
      const prevCompleted = Array.from(current);
      const prevStatus = optimisticStatus ?? pathData.status;
      try {
        await Sentry.startSpan(
          {
            op: "ai.path",
            name: checked ? "Mark Module Completed" : "Mark Module Incomplete",
          },
          async () => {
            // Optimistic update
            if (checked) current.add(moduleId);
            else current.delete(moduleId);
            const nextCompleted = Array.from(current);
            const allDone = pathData.modules.every((m) =>
              nextCompleted.includes(m.id),
            );
            setOptimisticCompleted(nextCompleted);
            setOptimisticStatus(allDone ? "completed" : "active");

            // Persist
            if (checked) {
              const res = await markCompleted({
                learningPathId: pathData._id,
                moduleId,
              });
              const completed = res?.completedModuleIds ?? nextCompleted;
              const next =
                completed.length >= pathData.modules.length
                  ? "completed"
                  : "active";
              setOptimisticStatus(next);
              setOptimisticCompleted(completed);
            } else {
              const res = await markIncomplete({
                learningPathId: pathData._id,
                moduleId,
              });
              const completed = res?.completedModuleIds ?? nextCompleted;
              const next =
                completed.length >= pathData.modules.length
                  ? "completed"
                  : "active";
              setOptimisticStatus(next);
              setOptimisticCompleted(completed);
            }
          },
        );
      } catch (err) {
        setOptimisticCompleted(prevCompleted);
        setOptimisticStatus(prevStatus as "active" | "completed");
        Sentry.captureException(err as Error, {
          tags: { area: "ai", action: "toggleModule" },
        });
        toast.error(
          checked ? t("toggleCompleteError") : t("toggleIncompleteError"),
        );
      }
    },
    [
      markCompleted,
      markIncomplete,
      pathData,
      optimisticCompleted,
      optimisticStatus,
      t,
    ],
  );

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
              <Button
                variant="secondary"
                onClick={onSave}
                disabled={isLoading || saving}
              >
                {t("save")}
              </Button>
              <Button
                onClick={onStartAssessment}
                disabled={isLoading || starting || !state?.aiSkillId}
              >
                {starting ? t("startingLabel") : t("startAssessment")}
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
          <CardContent className="space-y-4">
            {!state?.aiSkillId ? (
              <p className="text-muted-foreground text-sm">
                {t("selectSkillToViewPath")}
              </p>
            ) : learningPath === undefined ? (
              <p className="text-muted-foreground text-sm">
                {t("pathLoading")}
              </p>
            ) : !pathData ? (
              <div className="text-muted-foreground">
                <p className="text-sm font-medium">{t("noPathTitle")}</p>
                <p className="text-xs">{t("noPathHint")}</p>
              </div>
            ) : (
              <div className="space-y-4" dir={locale === "ar" ? "rtl" : "ltr"}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      {t("progressLabel", {
                        done: (
                          optimisticCompleted ?? pathData.completedModuleIds
                        ).length,
                        total: pathData.modules.length,
                      })}
                    </p>
                    <Badge
                      variant={
                        optimisticStatus === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {optimisticStatus === "completed"
                        ? t("statusCompleted")
                        : t("statusActive")}
                    </Badge>
                  </div>
                  {(() => {
                    const done = (
                      optimisticCompleted ?? pathData.completedModuleIds
                    ).length;
                    const total = pathData.modules.length || 1;
                    const percent = Math.round((done / total) * 100);
                    return (
                      <div className="space-y-1">
                        <Progress value={percent} />
                        <p
                          className="text-muted-foreground text-xs"
                          aria-live="polite"
                        >
                          {t("progressPercent", { percent })}
                        </p>
                      </div>
                    );
                  })()}
                  <ul className="space-y-2">
                    {pathData.modules.map((module) => {
                      const id = `lp-${pathData._id}-${module.id}`;
                      const checked = (
                        optimisticCompleted ?? pathData.completedModuleIds
                      ).includes(module.id);
                      return (
                        <li key={module.id} className="flex items-center gap-2">
                          <Checkbox
                            id={id}
                            checked={checked}
                            onCheckedChange={(val) =>
                              onToggleModule(module.id, Boolean(val))
                            }
                            aria-label={module.title}
                          />
                          <Label htmlFor={id} className="text-sm">
                            {module.title}
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
