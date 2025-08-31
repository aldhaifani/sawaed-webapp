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
    expect(p).toContain("Example conversation (illustrative):");
    expect(p).toContain("Example JSON (illustrative only, do NOT output now):");
    // Phase 2: contextual checks
    expect(p).toContain("[L3]"); // base level when no latestLevel
    expect(p).toContain("[L4]"); // upshift example cue
    expect(p).toContain("[L2]"); // downshift example cue
    expect(p).toContain("the skill"); // generic fallback skill token
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
    expect(p).toContain("مثال محادثة (إرشادي):");
    expect(p).toContain("مثال JSON (للتوضيح فقط، لا تخرجه الآن):");
    // Phase 2: contextual checks
    expect(p).toContain("[L3]");
    expect(p).toContain("[L4]");
    expect(p).toContain("[L2]");
    expect(p).toContain("المهارة");
  });
});
