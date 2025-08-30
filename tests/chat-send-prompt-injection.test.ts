import { describe, expect, it, vi, beforeEach } from "vitest";

// Minimal mocks like in chat-integration
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
  convexAuthNextjsToken: async () => "", // prevents Convex mutations; focuses test on builder usage
}));

// Spy on the prompt builder
import * as PromptBuilder from "@/app/api/chat/prompt-builder";
import { POST as sendPOST } from "@/app/api/chat/send/route";

function makeRequest(locale: "en" | "ar") {
  return new Request("http://localhost/api/chat/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-locale": locale,
    },
    body: JSON.stringify({ skillId: "skill_test", message: "hi" }),
  });
}

describe("chat send route prompt injection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls buildSystemPrompt with locale and skillId", async () => {
    const spy = vi.spyOn(PromptBuilder, "buildSystemPrompt").mockResolvedValue({
      systemPrompt: "TEST_PROMPT",
    });

    const res = await sendPOST(makeRequest("en"));
    expect(res.ok).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    const args = spy.mock.calls[0]![0]!;
    expect(args.locale).toBe("en");
    expect(args.aiSkillId).toBe("skill_test");
  });

  it("continues gracefully if buildSystemPrompt throws", async () => {
    vi.spyOn(PromptBuilder, "buildSystemPrompt").mockRejectedValue(
      new Error("boom"),
    );
    const res = await sendPOST(makeRequest("ar"));
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { sessionId: string };
    expect(typeof data.sessionId).toBe("string");
  });
});
