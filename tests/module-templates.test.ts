import { describe, it, expect } from "vitest";
import { ModuleTemplates } from "@/shared/ai/module-templates";

describe("ModuleTemplates", () => {
  it("exposes a non-empty semantic version", () => {
    const v = ModuleTemplates.getVersion();
    expect(typeof v).toBe("string");
    expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("returns template fields for EN and AR for level/type", () => {
    const en = ModuleTemplates.getTemplate({
      level: 3,
      type: "project",
      locale: "en",
    });
    const ar = ModuleTemplates.getTemplate({
      level: 3,
      type: "project",
      locale: "ar",
    });
    expect(en.titlePatterns.length).toBeGreaterThan(0);
    expect(ar.titlePatterns.length).toBeGreaterThan(0);
    expect(typeof en.durationBand).toBe("string");
  });

  it("builds concise instruction with skill token replacement", () => {
    const s = ModuleTemplates.toConciseInstruction({
      level: 4,
      type: "article",
      locale: "en",
      skillToken: "Time Management",
    });
    expect(s).toContain("L4 article");
    expect(s).toContain("Time Management");
  });

  it("throws for unknown level", () => {
    expect(() =>
      ModuleTemplates.getTemplate({ level: 999, type: "quiz", locale: "en" }),
    ).toThrow();
  });
});
