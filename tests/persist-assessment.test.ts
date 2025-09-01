import { describe, it, expect, vi, beforeEach } from "vitest";
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

import { persistIfValidAssessment } from "@/app/api/chat/send/route";

// Mock convex fetchMutation to capture calls
vi.mock("convex/nextjs", () => ({
  fetchMutation: vi.fn(async () => ({})),
}));

// Sentry noop in test
vi.mock("@sentry/nextjs", () => ({
  startSpan: (_opts: any, cb: any) => cb({ setAttribute: () => {} }),
  addBreadcrumb: () => {},
  captureMessage: () => {},
  captureException: () => {},
}));

// Mock session store functions
vi.mock("@/app/api/chat/_store", () => ({
  setAssessmentPersisted: vi.fn(() => true), // Allow persistence
}));

describe("persistIfValidAssessment", () => {
  const validJson = {
    level: 3,
    confidence: 0.7,
    reasoning: "Short reasoning",
    learningModules: [
      {
        id: "m1",
        title: "A",
        type: "article",
        duration: "10 min",
        description: "Learn about topic A",
        objectives: ["Understand A", "Apply A concepts"],
        outline: ["Introduction", "Main content", "Summary"],
      },
      {
        id: "m2",
        title: "B",
        type: "video",
        duration: "20 min",
        description: "Video tutorial on B",
        objectives: ["Watch B demo", "Practice B skills"],
        outline: ["Setup", "Tutorial", "Practice"],
      },
      {
        id: "m3",
        title: "C",
        type: "quiz",
        duration: "30 min",
        description: "Test knowledge of C",
        objectives: ["Apply C knowledge", "Check understanding"],
        outline: ["Questions", "Answers", "Review"],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists when valid JSON is present", async () => {
    const { fetchMutation } = await import("convex/nextjs");
    const text = [
      "Intro",
      "",
      "",
      "",
      "",
      "",
      "```json",
      JSON.stringify(validJson),
      "```",
      "Thanks",
    ].join("\n");

    await persistIfValidAssessment({
      sessionId: "test-session-1",
      text,
      skillId: "skill_1",
      convexToken: "token",
    });
    expect(fetchMutation).toHaveBeenCalledTimes(1);
    const call = (fetchMutation as any).mock.calls[0];
    expect(call[0]).toBeDefined();
    expect(call[1].aiSkillId).toBe("skill_1");
    expect(call[1].result.level).toBe(3);
  });

  it("does nothing when invalid JSON", async () => {
    const { fetchMutation } = await import("convex/nextjs");
    const text = "no json here";
    await persistIfValidAssessment({
      sessionId: "test-session-2",
      text,
      skillId: "skill_1",
      convexToken: "token",
    });
    expect(fetchMutation).not.toHaveBeenCalled();
  });

  it("does nothing without convex token", async () => {
    const { fetchMutation } = await import("convex/nextjs");
    const text = ["", "", "```json", JSON.stringify(validJson), "```", ""].join(
      "\n",
    );
    await persistIfValidAssessment({
      sessionId: "test-session-3",
      text,
      skillId: "skill_1",
      convexToken: null,
    });
    expect(fetchMutation).not.toHaveBeenCalled();
  });
});
