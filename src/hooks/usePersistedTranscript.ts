"use client";

import { useCallback, useMemo } from "react";

/**
 * Persists chat transcripts per skill to localStorage.
 * Storage key format: `sawaed/chat/${skillId}`
 */
export type ChatTranscriptMessage = {
  readonly id: string;
  readonly role: "user" | "ai";
  readonly content: string;
  readonly createdAt: number;
  readonly streaming?: boolean;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function usePersistedTranscript(skillId: string | undefined): {
  readonly storageKey: string | null;
  readonly load: () => readonly ChatTranscriptMessage[];
  readonly save: (msgs: readonly ChatTranscriptMessage[]) => void;
  readonly clear: () => void;
} {
  const storageKey = useMemo(() => {
    if (!skillId) return null;
    return `sawaed/chat/${skillId}` as const;
  }, [skillId]);

  const load = useCallback((): readonly ChatTranscriptMessage[] => {
    if (!isBrowser() || !storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed as ChatTranscriptMessage[];
    } catch {
      return [];
    }
  }, [storageKey]);

  const save = useCallback(
    (msgs: readonly ChatTranscriptMessage[]): void => {
      if (!isBrowser() || !storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(msgs));
      } catch {
        // ignore quota errors
      }
    },
    [storageKey],
  );

  const clear = useCallback((): void => {
    if (!isBrowser() || !storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { storageKey, load, save, clear };
}
