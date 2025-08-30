import { describe, it, expect, vi } from "vitest";

// Mock Next and Convex auth server modules for Vitest environment
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
vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: async () => "test_token",
}));

// Mock Sentry as noop
vi.mock("@sentry/nextjs", () => ({
  startSpan: (_opts: any, cb: any) => cb({ setAttribute: () => {} }),
  addBreadcrumb: () => {},
  captureException: () => {},
  captureMessage: () => {},
}));

// Capture Convex mutations
vi.mock("convex/nextjs", () => ({
  fetchMutation: vi.fn(async () => ({})),
}));

// Mock Gemini generation: streaming yields non-JSON; repair (generateOnce) yields JSON
vi.mock("@/lib/gemini", () => ({
  generateWithStreaming: async (_args: any) => {
    return {
      // minimal interface for our route's usage: onChunk callback pattern is internal; we can simulate whole text via return object
      // The route's streaming code listens on returned stream of chunks; our test will rely on the route eventually using validateAndMaybeRepair.
      // To keep simple, we return a shape compatible with code paths using appendPartial & then finalize
      // However in our route, we call generateWithStreaming and manually push chunks to appendPartial via callback logic inside runGeminiGeneration.
      // Here, we simulate a result container the route will iterate; the actual code uses the real function to drive callbacks.
      // Instead, we'll cause the route to proceed without early JSON so repair kicks in; we do this by returning non-JSON text via a simple string path when generateWithStreaming isn't strictly asserted.
      // Fallback: we return an object with [Symbol.asyncIterator] that yields one chunk-equivalent string.
      async *[Symbol.asyncIterator]() {
        yield {
          text: "Here is your assessment: Level around 3 but in prose.",
        } as any;
      },
    } as any;
  },
  generateOnce: async (_args: any) => {
    const valid = {
      aiSkillId: "skill_test",
      level: 2,
      confidence: 0.8,
      language: "en",
      rationale: "Based on user answers.",
      learningModules: [
        {
          type: "video",
          title: "Intro",
          description: "Basics",
          durationMin: 10,
        },
      ],
    };
    return ["Here is the JSON:", "```json", JSON.stringify(valid), "```"].join(
      "\n",
    );
  },
}));

import { POST as sendPOST } from "@/app/api/chat/send/route";
import { GET as statusGET } from "@/app/api/chat/status/route";

async function postSend(message: string, locale: "en" | "ar") {
  const req = new Request("http://localhost/api/chat/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-locale": locale,
    },
    body: JSON.stringify({ skillId: "skill_test", message }),
  });
  const res = await sendPOST(req);
  expect(res.ok).toBe(true);
  const data = (await res.json()) as {
    sessionId: string;
    conversationId?: string | null;
  };
  return data;
}

async function getStatus(sessionId: string) {
  const req = new Request(
    `http://localhost/api/chat/status?sessionId=${encodeURIComponent(sessionId)}`,
  );
  const res = await statusGET(req);
  return (await res.json()) as { status: string; text: string };
}

describe("repair -> persist E2E simulation", () => {
  it("repairs non-JSON output to valid JSON and persists assessment", async () => {
    const { fetchMutation } = await import("convex/nextjs");
    (fetchMutation as any).mockClear();

    const { sessionId } = await postSend("Start assessment", "en");

    // poll until done
    const started = Date.now();
    let status = "";
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const s = await getStatus(sessionId);
      status = s.status;
      if (status === "done") break;
      if (Date.now() - started > 4000) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(status).toBe("done");

    // ensure storeAssessment called with expected payload AI skill id
    expect(fetchMutation).toHaveBeenCalled();
    const calls = (fetchMutation as any).mock.calls;
    const found = calls.some(
      ([, args]: any[]) => args && args.aiSkillId === "skill_test",
    );
    expect(found).toBe(true);
  });
});
