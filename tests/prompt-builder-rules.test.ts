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
    expect(p).toContain("Language and tone rules:");
    expect(p).toContain("Turn-taking rules:");
    expect(p).toContain("Dynamic difficulty:");
    expect(p).toContain("Output Instructions:");
    expect(p).toContain(
      "exactly one valid JSON block inside a ```json fenced code block with no prose before or after",
    );
  });

  it("includes bilingual tone, turn-taking, dynamic difficulty, and stricter JSON in AR", async () => {
    const out = await buildSystemPrompt({
      aiSkillId: "x",
      locale: "ar",
      convexToken: null,
    });
    const p = out.systemPrompt;
    expect(p).toContain("قواعد اللغة والنبرة:");
    expect(p).toContain("قواعد تبادل الأدوار:");
    expect(p).toContain("التكيُّف مع الصعوبة:");
    expect(p).toContain("التعليمات الخاصة بالمخرجات:");
    expect(p).toContain("أخرج كتلة واحدة فقط من JSON الصالح داخل سياج ```json");
  });
});
