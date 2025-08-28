"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";
import * as Sentry from "@sentry/nextjs";

/**
 * Hook to initialize an AI assessment session for a selected skill.
 * - Reads user chat config for coherence
 * - Calls `api.aiAssessments.startAssessment` mutation
 * - Provides loading/error/data state and an explicit `init()` method
 */
export interface AiChatInitData {
  readonly aiSkill: {
    readonly _id: Id<"aiSkills">;
    readonly nameEn: string;
    readonly nameAr: string;
    readonly category?: string;
    readonly definitionEn: string;
    readonly definitionAr: string;
    readonly levels: ReadonlyArray<{
      readonly level: number;
      readonly nameEn: string;
      readonly nameAr: string;
      readonly descriptionEn: string;
      readonly descriptionAr: string;
    }>;
  };
  readonly latestAssessment?: {
    readonly _id: Id<"aiAssessments">;
    readonly level: number;
    readonly confidence: number;
    readonly createdAt: number;
  };
  readonly activeLearningPath?: {
    readonly _id: Id<"aiLearningPaths">;
    readonly status: "active" | "completed" | "archived";
    readonly modules: ReadonlyArray<{
      readonly id: string;
      readonly title: string;
      readonly type: "article" | "video" | "quiz" | "project";
      readonly duration: string;
    }>;
    readonly createdAt: number;
  };
}

export interface UseAiChatInitResult {
  readonly init: (aiSkillId: Id<"aiSkills">) => Promise<AiChatInitData | null>;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly data: AiChatInitData | null;
  readonly preferredLanguage: "ar" | "en" | undefined;
}

export function useAiChatInit(): UseAiChatInitResult {
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "ar" ? "ar" : "en";
  const start = useMutation(api.aiAssessments.startAssessment);
  const chatConfig = useQuery(api.aiChatConfigs.getMyChatConfig, {});

  const [data, setData] = useState<AiChatInitData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const lastSkillRef = useRef<string | null>(null);

  const preferredLanguage = useMemo(() => {
    if (chatConfig === undefined) return undefined;
    if (chatConfig === null) return locale;
    return chatConfig.preferredLanguage ?? locale;
  }, [chatConfig, locale]);

  const init = useCallback(
    async (aiSkillId: Id<"aiSkills">): Promise<AiChatInitData | null> => {
      setIsLoading(true);
      setError(null);
      return Sentry.startSpan(
        { op: "ai.init", name: "Start Assessment" },
        async () => {
          try {
            lastSkillRef.current = String(aiSkillId);
            const res = await start({ aiSkillId });
            setData(res ?? null);
            return res ?? null;
          } catch (err) {
            const e = err instanceof Error ? err : new Error("Unknown error");
            setError(e);
            Sentry.captureException(e, {
              tags: { area: "ai", action: "startAssessment" },
            });
            return null;
          } finally {
            setIsLoading(false);
          }
        },
      );
    },
    [start],
  );

  return { init, isLoading, error, data, preferredLanguage };
}
