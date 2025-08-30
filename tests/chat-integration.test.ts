import { describe, expect, it, vi, beforeAll } from "vitest";

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
  convexAuthNextjsToken: async () => "",
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
  expect(typeof data.sessionId).toBe("string");
  expect(data.sessionId.length).toBeGreaterThan(0);
  return data;
}

async function getStatus(sessionId: string) {
  const req = new Request(
    `http://localhost/api/chat/status?sessionId=${encodeURIComponent(sessionId)}`,
  );
  const res = await statusGET(req);
  const data = (await res.json()) as {
    status: string;
    text: string;
  };
  return data;
}

describe("chat routes integration (simulation in test env)", () => {
  it("should create a session and reach done status with non-empty text", async () => {
    const { sessionId } = await postSend("Hello there", "en");

    // Poll for up to ~3 seconds
    const started = Date.now();
    let status = "";
    let text = "";
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const s = await getStatus(sessionId);
      status = s.status;
      text = s.text;
      if (status === "done") break;
      if (Date.now() - started > 3000) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(status).toBe("done");
    expect(text.length).toBeGreaterThan(0);
  });
});
