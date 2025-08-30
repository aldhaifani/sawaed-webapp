import { describe, it, expect } from "vitest";
import { detectAssessmentFromText } from "../src/shared/ai/detect-assessment";

function sampleModules(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i + 1}`,
    title: `Module ${i + 1}`,
    type: "article",
    duration: "10 min",
  }));
}

function sampleAssessment(overrides: Record<string, unknown> = {}) {
  return {
    level: 2,
    confidence: 0.8,
    reasoning: "Because the answers showed intermediate understanding.",
    learningModules: sampleModules(3),
    ...overrides,
  };
}

describe("detectAssessmentFromText", () => {
  it("detects valid fenced JSON with learningModules", () => {
    const payload = sampleAssessment();
    const text = [
      "Some analysis...",
      "```json",
      JSON.stringify(payload, null, 2),
      "```",
      "Thanks!",
    ].join("\n");
    const res = detectAssessmentFromText(text);
    expect(res.valid).toBe(true);
    expect(res.data).toBeTruthy();
  });

  it("detects valid fenced JSON with modules (normalized)", () => {
    const payload = sampleAssessment({
      learningModules: undefined,
      modules: sampleModules(3),
    });
    const text = ["```json", JSON.stringify(payload), "```"].join("\n");
    const res = detectAssessmentFromText(text);
    expect(res.valid).toBe(true);
  });

  it("detects raw brace JSON without fences", () => {
    const payload = sampleAssessment();
    const text = `Intro... ${JSON.stringify(payload)} ...outro`;
    const res = detectAssessmentFromText(text);
    expect(res.valid).toBe(true);
  });

  it("rejects invalid schema (too few modules)", () => {
    const payload = sampleAssessment({ learningModules: sampleModules(2) });
    const text = ["```json", JSON.stringify(payload), "```"].join("\n");
    const res = detectAssessmentFromText(text);
    expect(res.valid).toBe(false);
  });

  it("rejects invalid schema (duplicate module ids)", () => {
    const dupModules = [
      { id: "m1", title: "A", type: "article", duration: "10 min" },
      { id: "m1", title: "B", type: "article", duration: "10 min" },
      { id: "m2", title: "C", type: "article", duration: "10 min" },
    ];
    const payload = sampleAssessment({ learningModules: dupModules });
    const text = ["```json", JSON.stringify(payload), "```"].join("\n");
    const res = detectAssessmentFromText(text);
    expect(res.valid).toBe(false);
  });

  it("returns invalid when no JSON present", () => {
    const res = detectAssessmentFromText("No JSON here, just text.");
    expect(res.valid).toBe(false);
  });
});
