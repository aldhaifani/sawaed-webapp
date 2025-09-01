import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Next server json helper
vi.mock("next/server", () => ({
  NextResponse: class {
    static json(data: unknown, init?: { status?: number }) {
      return new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      });
    }
  },
}));

// Force convex token to be present so route persists
vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: async () => "test-token",
}));

// Capture calls to fetchMutation
const mutationCalls: Array<{ name: string; args: unknown }> = [];
vi.mock("convex/nextjs", async () => {
  const mod =
    await vi.importActual<typeof import("convex/nextjs")>("convex/nextjs");
  return {
    ...mod,
    fetchMutation: async (name: unknown, args: unknown) => {
      const key = typeof name === "string" ? name : JSON.stringify(name);
      mutationCalls.push({ name: key, args });
      // Return small mocked payloads where needed by route
      if (key?.toString().includes("aiConversations.createOrGetActive")) {
        return { conversationId: "conv1" } as unknown;
      }
      if (key?.toString().includes("aiMessages.addAssistantMessage")) {
        return { totalQuestions: 1 } as unknown;
      }
      return {} as unknown;
    },
    fetchQuery: async () => [],
  };
});

// Mock prompt-builder to provide allowedUrls
vi.mock("@/app/api/chat/prompt-builder", () => ({
  buildSystemPrompt: async () => ({
    systemPrompt: "system",
    allowedUrls: ["https://allowed.com/a"],
  }),
}));
// Also mock the exact relative specifier used by the route file
vi.mock("../prompt-builder", () => ({
  buildSystemPrompt: async () => ({
    systemPrompt: "system",
    allowedUrls: ["https://allowed.com/a"],
  }),
}));

// Mock Gemini to emit one chunk containing a valid assessment JSON block
vi.mock("@/lib/gemini", () => ({
  generateWithStreaming: async (
    _config: unknown,
    handlers: { onChunkText: (s: string) => void; onDone: () => void },
  ) => {
    const json = JSON.stringify({
      level: 3,
      confidence: 0.9,
      learningModules: [
        {
          id: "m1",
          title: "T1",
          type: "article",
          duration: "5 min",
          resourceUrl: "https://not-allowed.com/x",
          searchKeywords: ["kw"],
        },
        {
          id: "m2",
          title: "T2",
          type: "video",
          duration: "7 min",
          resourceUrl: "https://allowed.com/a",
          searchKeywords: [
            "k1",
            "k2",
            "k3",
            "k4",
            "k5",
            "k6",
            "k7",
            "k8",
            "k9",
            "k10",
          ],
        },
        {
          id: "m3",
          title: "T3",
          type: "quiz",
          duration: "3 min",
        },
      ],
    });
    const text = "Here is the result.\n\n" + "```json\n" + json + "\n```\n";
    handlers.onChunkText(text);
    handlers.onDone();
    return {};
  },
  generateOnce: async () => "",
}));

import { POST as sendPOST } from "@/app/api/chat/send/route";

async function postSend(message: string, locale: "en" | "ar") {
  const req = new Request("http://localhost/api/chat/send", {
    method: "POST",
    headers: { "content-type": "application/json", "x-locale": locale },
    body: JSON.stringify({ skillId: "skill_test", message }),
  });
  const res = await sendPOST(req);
  expect(res.ok).toBe(true);
}

describe("persistIfValidAssessment allowlist enforcement (integration)", () => {
  beforeEach(() => {
    mutationCalls.length = 0;
  });

  it("drops URLs not in allowlist and keeps allowed URL; clamps keywords", async () => {
    await postSend("start", "en");

    // Wait for async persistence
    const started = Date.now();
    let store: { args: any } | undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      store = mutationCalls.find(
        (c) => (c.args as any)?.result?.learningModules,
      ) as { args: any } | undefined;
      if (store) break;
      if (Date.now() - started > 3000) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(store).toBeTruthy();
    const args = (store as { args: any }).args;

    // Validate payload shape and allowlist behavior
    expect(args?.result?.learningModules?.length).toBe(3);

    const m1 = args.result.learningModules[0];
    const m2 = args.result.learningModules[1];

    // Not allowed URL should be dropped and keywords ensured >=3
    expect(m1.resourceUrl).toBeUndefined();
    expect((m1.searchKeywords ?? []).length).toBeGreaterThanOrEqual(3);

    // Allowed URL should be kept; keywords clamped to 10
    expect(m2.resourceUrl).toBe("https://allowed.com/a");
    expect((m2.searchKeywords ?? []).length).toBe(10);
  });
});
