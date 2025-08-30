import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatStatusPoll } from "@/hooks/use-chat-status-poll";

function mockFetchSequence(
  responses: Array<{
    status?: number;
    ok?: boolean;
    json?: unknown;
    headers?: Record<string, string>;
  }>,
) {
  const seq = [...responses];
  global.fetch = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) => {
      const next = seq.shift();
      if (!next) throw new Error("No more mocked responses");
      const status = next.status ?? 200;
      const ok = next.ok ?? (status >= 200 && status < 300);
      const jsonVal = next.json ?? {};
      const headers = new Headers(next.headers ?? {});
      return {
        status,
        ok,
        headers,
        json: async () => jsonVal,
      } as unknown as Response;
    },
  ) as unknown as typeof fetch;
}

describe("useChatStatusPoll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("emits progress then done", async () => {
    const sessionId = "s1";
    const aiMessageId = "a1";

    // First call: running with text
    // Second call: 304 not modified (no change)
    // Third call: done
    mockFetchSequence([
      {
        status: 200,
        json: {
          sessionId,
          status: "running",
          text: "Hello",
          updatedAt: 1,
        },
        headers: { etag: 'W/"1"' },
      },
      { status: 304 },
      {
        status: 200,
        json: {
          sessionId,
          status: "done",
          text: "Hello world",
          updatedAt: 2,
        },
        headers: { etag: 'W/"2"' },
      },
    ]);

    const onProgress = vi.fn();
    const onDone = vi.fn();

    const { result } = renderHook(() =>
      useChatStatusPoll({
        pollIntervalMs: 10,
        onProgress,
        onDone,
      }),
    );

    act(() => {
      result.current.startPolling({ sessionId, aiMessageId });
    });

    // Run pending microtasks + timers to process first response
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        aiMessageId,
        text: "Hello",
        status: "running",
        progressed: true,
      }),
    );

    // advance timers enough to cover next two scheduled polls (about 500ms and 650ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(onDone).toHaveBeenCalledWith({ aiMessageId, text: "Hello world" });
  });

  it("handles error path and calls onError after retries", async () => {
    const sessionId = "s2";
    const aiMessageId = "a2";

    mockFetchSequence([
      { status: 500, ok: false },
      { status: 500, ok: false },
      { status: 500, ok: false },
    ]);

    const onError = vi.fn();

    const { result } = renderHook(() =>
      useChatStatusPoll({ pollIntervalMs: 5, onError }),
    );

    act(() => {
      result.current.startPolling({ sessionId, aiMessageId });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(onError).toHaveBeenCalled();
  });

  it("sendMessage returns session id on success and null on failure", async () => {
    // First POST ok, second POST fails
    const sessionId = "s3";

    // Mock POST for send
    global.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input === "string" && input.includes("/api/chat/send")) {
          if ((global.fetch as any).__count) {
            return { ok: false, json: async () => ({}) } as unknown as Response;
          }
          (global.fetch as any).__count = 1;
          return {
            ok: true,
            json: async () => ({ sessionId }),
          } as unknown as Response;
        }
        // status polling not used here
        return { ok: true, json: async () => ({}) } as unknown as Response;
      },
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useChatStatusPoll());

    const ok = await result.current.sendMessage({
      skillId: "k",
      message: "m",
      locale: "en",
    });
    expect(ok).toBe(sessionId);

    const fail = await result.current.sendMessage({
      skillId: "k",
      message: "m",
      locale: "en",
    });
    expect(fail).toBeNull();
  });
});
