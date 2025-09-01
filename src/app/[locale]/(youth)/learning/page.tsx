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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Film,
  HelpCircle,
  Hammer,
  Clock,
  Target,
  ListTree,
  CheckCircle2,
} from "lucide-react";
import moduleTemplates from "@/../data/learning_path/module_templates.json";

interface ChatConfigState {
  readonly aiSkillId?: Id<"aiSkills">;
  readonly preferredLanguage: "ar" | "en";
}

// Local component: Tabs-based module navigation (Phase 1 skeleton)
function LearningModulesTabs({
  modules,
  dir,
  completedIds,
  onToggle,
  assessmentLevel,
  locale,
}: {
  modules: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly type: "article" | "video" | "quiz" | "project";
    readonly duration: string;
  }>;
  dir: "rtl" | "ltr";
  completedIds: readonly string[];
  onToggle: (moduleId: string, nextChecked: boolean) => void | Promise<void>;
  assessmentLevel?: number;
  locale: "ar" | "en";
}): ReactElement {
  const [active, setActive] = useState<string>(modules[0]?.id ?? "");
  const t = useTranslations("learning");

  type TemplateEntry = {
    readonly objectives?: readonly string[];
    readonly outline?: readonly string[];
  };

  type ModuleTemplates = {
    readonly levels: ReadonlyArray<{
      readonly level: number;
      readonly templates: Record<
        "article" | "video" | "quiz" | "project",
        Record<
          "en" | "ar",
          { readonly objectives?: string[]; readonly outline?: string[] }
        >
      >;
    }>;
  };

  const isModuleTemplates = (x: unknown): x is ModuleTemplates => {
    if (typeof x !== "object" || x === null) return false;
    const maybe = x as { readonly levels?: unknown };
    return Array.isArray(maybe.levels);
  };

  const getTemplateContent = (
    level: number | undefined,
    type: "article" | "video" | "quiz" | "project",
    loc: "ar" | "en",
  ): TemplateEntry | null => {
    try {
      if (!isModuleTemplates(moduleTemplates)) return null;
      const levels = moduleTemplates.levels;
      if (!Array.isArray(levels) || levels.length === 0) return null;
      const first = levels[0];
      if (!first) return null;
      const lv = level ?? first.level;
      const exact = levels.find((l) => l.level === lv);
      const chosen = exact ?? first;
      const typed = chosen.templates[type]?.[loc];
      if (!typed) return null;
      return {
        objectives: typed.objectives ?? [],
        outline: typed.outline ?? [],
      };
    } catch {
      return null;
    }
  };

  const iconFor = (type: "article" | "video" | "quiz" | "project") => {
    switch (type) {
      case "article":
        return <BookOpen className="shrink-0" aria-hidden />;
      case "video":
        return <Film className="shrink-0" aria-hidden />;
      case "quiz":
        return <HelpCircle className="shrink-0" aria-hidden />;
      case "project":
        return <Hammer className="shrink-0" aria-hidden />;
      default:
        return <BookOpen className="shrink-0" aria-hidden />;
    }
  };

  if (modules.length === 0) return <></>;

  return (
    <Tabs value={active} onValueChange={setActive} dir={dir} className="w-full">
      <TabsList className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 w-full overflow-x-auto rounded-md p-1 backdrop-blur">
        {modules.map((m, idx) => (
          <TabsTrigger
            key={m.id}
            value={m.id}
            className="data-[state=active]:bg-primary/10 gap-2 whitespace-nowrap"
            aria-label={t("moduleLabel", { num: idx + 1 })}
          >
            {iconFor(m.type)}
            <span className="text-xs font-medium sm:text-sm">
              {t("moduleLabel", { num: idx + 1 })}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {modules.map((m) => (
        <TabsContent key={m.id} value={m.id} className="mt-3">
          <div className="bg-card rounded-lg border p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-foreground text-base leading-snug font-semibold sm:text-lg">
                  {m.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="px-2 py-0.5">
                    <Clock className="me-1 h-3.5 w-3.5" aria-hidden />
                    <span className="text-[11px] sm:text-xs">{m.duration}</span>
                  </Badge>
                  <Badge variant="outline" className="px-2 py-0.5">
                    <span className="me-1" aria-hidden>
                      {iconFor(m.type)}
                    </span>
                    <span className="text-[11px] sm:text-xs">{m.type}</span>
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:gap-3">
                {(() => {
                  const isCompleted = completedIds.includes(m.id);
                  return (
                    <Button
                      size="sm"
                      variant={isCompleted ? "secondary" : "default"}
                      onClick={() => onToggle(m.id, !isCompleted)}
                      aria-pressed={isCompleted}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      {isCompleted ? t("markIncomplete") : t("markComplete")}
                    </Button>
                  );
                })()}
              </div>
            </div>
            {(() => {
              const content = getTemplateContent(
                assessmentLevel,
                m.type,
                locale,
              );
              if (
                !content ||
                (!content.objectives?.length && !content.outline?.length)
              ) {
                return (
                  <div className="text-muted-foreground mt-3 text-sm">
                    {t("moduleContentPlaceholder")}
                  </div>
                );
              }
              return (
                <div className="mt-4 space-y-5">
                  {content.objectives && content.objectives.length > 0 ? (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Target className="h-4 w-4" aria-hidden />
                        {t("objectivesLabel")}
                      </h4>
                      <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed">
                        {content.objectives.map((obj, i) => (
                          <li key={`${m.id}-obj-${i}`}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {content.outline && content.outline.length > 0 ? (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <ListTree className="h-4 w-4" aria-hidden />
                        {t("outlineLabel")}
                      </h4>
                      <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed">
                        {content.outline.map((item, i) => (
                          <li key={`${m.id}-out-${i}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
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

  // Learning Path queries
  const myActivePath = useQuery(api.aiAssessments.getMyActiveLearningPath, {});
  const learningPath = useQuery(
    api.aiAssessments.getLearningPath,
    state?.aiSkillId ? { aiSkillId: state.aiSkillId } : "skip",
  );

  type Module = {
    readonly id: string;
    readonly title: string;
    readonly type: "article" | "video" | "quiz" | "project";
    readonly duration: string;
  };
  type LearningPath =
    | {
        readonly _id: Id<"aiLearningPaths">;
        readonly modules: readonly Module[];
        readonly status: "active" | "completed" | "archived";
        readonly completedModuleIds: readonly string[];
        readonly createdAt: number;
        readonly updatedAt?: number;
        readonly assessmentId?: Id<"aiAssessments">;
        readonly assessmentLevel?: number;
      }
    | null
    | undefined;

  // Prefer globally active path if present; otherwise fallback to skill-specific path
  const pathData = (myActivePath ?? learningPath) as LearningPath;
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
  const unenroll = useMutation(api.aiAssessments.unenrollLearningPath);

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
        {/* Settings card: show only when no active path AND not loading */}
        {pathData === null ? (
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
                <p className="text-muted-foreground text-xs">
                  {t("skillHelp")}
                </p>
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
        ) : null}

        {/* Active learning path card: only when path exists */}
        {pathData ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-start justify-between text-base">
                <div>{t("learningPathTitle")}</div>
                <UnenrollSection
                  onConfirm={async () => {
                    try {
                      await Sentry.startSpan(
                        { op: "ai.path", name: "Unenroll Learning Path" },
                        async () => {
                          await unenroll({ learningPathId: pathData._id });
                        },
                      );
                      toast.success(t("unenrollSuccess"));
                    } catch (err) {
                      Sentry.captureException(err as Error, {
                        tags: { area: "ai", action: "unenroll" },
                      });
                      toast.error(t("unenrollError"));
                    }
                  }}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myActivePath === undefined && learningPath === undefined ? (
                <p className="text-muted-foreground text-sm">
                  {t("pathLoading")}
                </p>
              ) : (
                <div
                  className="space-y-4"
                  dir={locale === "ar" ? "rtl" : "ltr"}
                >
                  {/* Progress summary */}
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
                  </div>

                  {/* Modules as tabs */}
                  <div className="space-y-3">
                    {pathData.modules.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t("noModules")}
                      </p>
                    ) : (
                      <LearningModulesTabs
                        modules={pathData.modules}
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        completedIds={
                          optimisticCompleted ?? pathData.completedModuleIds
                        }
                        onToggle={(moduleId, next) =>
                          onToggleModule(moduleId, next)
                        }
                        assessmentLevel={pathData.assessmentLevel}
                        locale={locale}
                      />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

// Local component: Unenroll confirmation dialog and trigger
function UnenrollSection({
  onConfirm,
}: {
  onConfirm: () => Promise<void>;
}): ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const t = useTranslations("learning");
  const tc = useTranslations("common");

  return (
    <div className="flex justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          className="mb-2"
        >
          {t("unenrollTitle")}
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("unenrollTitle")}</DialogTitle>
            <DialogDescription>{t("unenrollConfirmDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await onConfirm();
                setOpen(false);
              }}
            >
              {tc("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
