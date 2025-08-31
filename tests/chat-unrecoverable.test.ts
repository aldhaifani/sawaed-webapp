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

// Mock Gemini generation: streaming yields non-JSON; repair (generateOnce) also yields non-JSON repeatedly
vi.mock("@/lib/gemini", () => ({
  generateWithStreaming: async (_args: any) => {
    return {
      async *[Symbol.asyncIterator]() {
        yield { text: "Here is some prose without JSON." } as any;
      },
    } as any;
  },
  generateOnce: async (_args: any) => {
    // return non-JSON fenced but invalid (missing required fields) to force failure
    return ["```json", JSON.stringify({ note: "still not valid" }), "```"].join(
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
  return (await res.json()) as { status: string; text: string; error?: string };
}

describe("chat unrecoverable scenario", () => {
  it("returns status=error when repair fails and nothing valid is produced", async () => {
    const { fetchMutation } = await import("convex/nextjs");
    (fetchMutation as any).mockClear();

    const { sessionId } = await postSend("Start assessment", "en");

    const started = Date.now();
    let status = "";
    let error: string | undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const s = await getStatus(sessionId);
      status = s.status;
      error = s.error;
      if (status === "error") break;
      if (status === "done") break; // safety
      if (Date.now() - started > 4000) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(status).toBe("error");
    // Should not attempt to persist assessment on unrecoverable failure
    expect(fetchMutation).not.toHaveBeenCalled();
    // Optional: error message exists
    expect(typeof error === "string" || typeof error === "undefined").toBe(
      true,
    );
  });
});
