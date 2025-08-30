import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/app/api/chat/prompt-builder";
import {
  ALLOWED_MODULE_TYPES,
  MIN_MODULES,
  MAX_MODULES,
} from "@/shared/ai/constants";

// These tests exercise the builder without Convex by omitting convexToken
// They verify that local JSON fallback is used and that both locales are supported

describe("prompt-builder", () => {
  it("builds an English prompt with constraints and schema", async () => {
    const out = await buildSystemPrompt({
      aiSkillId: "dummy-skill-id",
      locale: "en",
      convexToken: null,
    });
    expect(out.systemPrompt).toContain("You assess the user's skill");
    expect(out.systemPrompt).toContain("Learning Path constraints:");
    expect(out.systemPrompt).toContain("Allowed types:");
    expect(out.systemPrompt).toContain("Output Instructions:");
    expect(out.systemPrompt).toContain("```json");
    expect(out.systemPrompt).toContain("learningModules");
    expect(out.systemPrompt).toContain("Multiple-choice format:");
    expect(out.systemPrompt).toContain("Module Templates (concise): v");
  });

  it("builds an Arabic prompt with constraints and schema", async () => {
    const out = await buildSystemPrompt({
      aiSkillId: "dummy-skill-id",
      locale: "ar",
      convexToken: null,
    });
    expect(out.systemPrompt).toContain("أنت مساعد يقيم مهارة المستخدم");
    expect(out.systemPrompt).toContain("قيود مسار التعلم:");
    expect(out.systemPrompt).toContain("التعليمات الخاصة بالمخرجات:");
    expect(out.systemPrompt).toContain("```json");
    expect(out.systemPrompt).toContain("صيغة الأسئلة متعددة الخيارات:");
    expect(out.systemPrompt).toContain("قوالب الوحدات (مختصر):");
  });

  it("includes allowed module types and min/max module constraints", async () => {
    const en = await buildSystemPrompt({
      aiSkillId: "x",
      locale: "en",
      convexToken: null,
    });
    const types = ALLOWED_MODULE_TYPES.join(" | ");
    expect(en.systemPrompt).toContain(`Allowed types: ${types}`);
    expect(en.systemPrompt).toContain(
      `between ${MIN_MODULES} and ${MAX_MODULES} learning modules`,
    );

    const ar = await buildSystemPrompt({
      aiSkillId: "x",
      locale: "ar",
      convexToken: null,
    });
    expect(ar.systemPrompt).toContain(`${MIN_MODULES}`);
    expect(ar.systemPrompt).toContain(`${MAX_MODULES}`);
  });
});
