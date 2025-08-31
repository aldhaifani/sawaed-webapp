import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/app/api/chat/prompt-builder";

describe("prompt-builder rules", () => {
  it("includes bilingual tone, turn-taking, dynamic difficulty, and stricter JSON in EN", async () => {
    const out = await buildSystemPrompt({
      aiSkillId: "x",
      locale: "en",
      convexToken: null,
    });
    const p = out.systemPrompt;
    expect(p).toContain("Tone: Friendly, professional, encouraging");
    expect(p).toContain("Rules: One question at a time");
    expect(p).toContain("MAXIMUM 5 questions STRICTLY");
    expect(p).toContain("Output Instructions:");
    expect(p).toContain(
      "exactly one valid JSON block inside a ```json fenced code block with no prose before or after",
    );
    expect(p).toContain("Question X/5");
    expect(p).toContain("Use full 10-level system (1-10)");
  });

  it("includes bilingual tone, turn-taking, dynamic difficulty, and stricter JSON in AR", async () => {
    const out = await buildSystemPrompt({
      aiSkillId: "x",
      locale: "ar",
      convexToken: null,
    });
    const p = out.systemPrompt;
    expect(p).toContain("النبرة: ودود ومهني ومشجِّع");
    expect(p).toContain("قواعد المحادثة:");
    expect(p).toContain("أقصى 5 أسئلة بدقة");
    expect(p).toContain("Output Instructions:");
    expect(p).toContain(
      "exactly one valid JSON block inside a ```json fenced code block with no prose before or after",
    );
    expect(p).toContain("السؤال X من 5");
    expect(p).toContain("استخدم نظام 10 مستويات كاملاً (1-10)");
  });
});
