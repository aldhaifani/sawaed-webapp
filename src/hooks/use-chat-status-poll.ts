import { useCallback, useEffect, useRef, useState } from "react";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | null;

export type StatusResponse = {
  readonly sessionId: string;
  readonly status: "queued" | "running" | "partial" | "done" | "error";
  readonly text: string;
  readonly updatedAt: number;
  readonly error?: string;
};

export type StartPollingInput = {
  readonly sessionId: string;
  readonly aiMessageId: string;
};

export type UseChatStatusPollParams = {
  readonly pollIntervalMs?: number;
  readonly onProgress?: (args: {
    aiMessageId: string;
    text: string;
    status: StatusResponse["status"];
    progressed: boolean;
  }) => void;
  readonly onDone?: (args: { aiMessageId: string; text: string }) => void;
  readonly onError?: () => void;
};

export type UseChatStatusPollReturn = {
  readonly connectionState: ConnectionState;
  readonly startPolling: (input: StartPollingInput) => void;
  readonly stopPolling: () => void;
  readonly sendMessage: (args: {
    skillId: string;
    message: string;
    locale: "ar" | "en";
  }) => Promise<string | null>;
};

export function useChatStatusPoll(
  params?: UseChatStatusPollParams,
): UseChatStatusPollReturn {
  const pollIntervalMs = params?.pollIntervalMs ?? 750;
  const onProgress = params?.onProgress;
  const onDone = params?.onDone;
  const onError = params?.onError;

  const [connectionState, setConnectionState] = useState<ConnectionState>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const aiMessageIdRef = useRef<string>("");
  const sessionIdRef = useRef<string>("");

  const stopPolling = useCallback((): void => {
    try {
      abortRef.current?.abort();
    } catch {}
    if (timeoutRef.current != null) {
      try {
        window.clearTimeout(timeoutRef.current);
      } catch {}
    }
    setConnectionState(null);
  }, []);

  const sendMessage = useCallback(
    async ({
      skillId,
      message,
      locale,
    }: {
      skillId: string;
      message: string;
      locale: "ar" | "en";
    }): Promise<string | null> => {
      try {
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-locale": locale,
            "cache-control": "no-store",
          },
          body: JSON.stringify({ skillId, message }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { sessionId?: string };
        return data.sessionId ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  const startPolling = useCallback(
    ({ sessionId, aiMessageId }: StartPollingInput): void => {
      stopPolling();
      const controller = new AbortController();
      abortRef.current = controller;
      setConnectionState("connecting");

      aiMessageIdRef.current = aiMessageId;
      sessionIdRef.current = sessionId;

      let consecutiveErrors = 0;
      let lastUpdatedAt = 0;
      let baseDelay = pollIntervalMs;
      let lastEtag: string | null = null;

      const loop = async (): Promise<void> => {
        if (controller.signal.aborted) return;
        try {
          const res = await fetch(
            `/api/chat/status?sessionId=${encodeURIComponent(sessionId)}`,
            {
              headers: {
                "cache-control": "no-store",
                ...(lastEtag ? { "if-none-match": lastEtag } : {}),
              },
            },
          );
          if (res.status === 304) {
            setConnectionState("connected");
            baseDelay = Math.min(2000, baseDelay + 150);
            if (!controller.signal.aborted) {
              const jitter = Math.random() * 0.4 - 0.2;
              const nextDelay = Math.max(
                300,
                Math.round(baseDelay * (1 + jitter)),
              );
              const id = window.setTimeout(() => {
                void loop();
              }, nextDelay);
              timeoutRef.current = id;
            }
            return;
          }
          if (!res.ok) throw new Error("status_not_ok");
          const data = (await res.json()) as StatusResponse;
          consecutiveErrors = 0;
          lastEtag = res.headers.get("etag");
          setConnectionState("connected");

          const progressed = data.updatedAt > lastUpdatedAt;
          lastUpdatedAt = Math.max(lastUpdatedAt, data.updatedAt);
          if (data.status === "running" || data.status === "partial") {
            baseDelay = progressed ? 500 : Math.min(2000, baseDelay + 250);
          } else if (data.status === "queued") {
            baseDelay = 1000;
          }

          if (progressed) {
            onProgress?.({
              aiMessageId,
              text: data.text,
              status: data.status,
              progressed: true,
            });
          } else {
            onProgress?.({
              aiMessageId,
              text: data.text,
              status: data.status,
              progressed: false,
            });
          }

          if (data.status === "done") {
            controller.abort();
            onDone?.({ aiMessageId, text: data.text });
            setConnectionState(null);
            return;
          }
          if (data.status === "error") {
            controller.abort();
            onError?.();
            setConnectionState("disconnected");
            return;
          }
        } catch {
          consecutiveErrors += 1;
          baseDelay = Math.min(4000, baseDelay + 500);
          setConnectionState(
            consecutiveErrors >= 3 ? "disconnected" : "reconnecting",
          );
          if (consecutiveErrors >= 3) {
            controller.abort();
            onError?.();
            return;
          }
        }

        if (!controller.signal.aborted) {
          const jitter = Math.random() * 0.4 - 0.2;
          const nextDelay = Math.max(300, Math.round(baseDelay * (1 + jitter)));
          const id = window.setTimeout(() => {
            void loop();
          }, nextDelay);
          timeoutRef.current = id;
        }
      };

      void loop();
    },
    [onDone, onError, onProgress, pollIntervalMs, stopPolling],
  );

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    connectionState,
    startPolling,
    stopPolling,
    sendMessage,
  } as const;
}
