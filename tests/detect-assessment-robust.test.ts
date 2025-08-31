import { describe, it, expect } from "vitest";
import { detectAssessmentFromText } from "../src/shared/ai/detect-assessment";

function sampleModules(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i + 1}`,
    title: `Module ${i + 1}`,
    type: "article" as const,
    duration: "10 min",
  }));
}

const base = {
  level: 3,
  confidence: 0.7,
  reasoning: "ok",
  learningModules: sampleModules(3),
};

describe("detectAssessmentFromText - robustness", () => {
  it("chooses a valid JSON when multiple fenced blocks exist", () => {
    const bad = { ...base, learningModules: [] };
    const good = base;
    const text = [
      "analysis ...",
      "```json",
      JSON.stringify(bad),
      "```",
      "more text ...",
      "```json",
      JSON.stringify(good),
      "```",
    ].join("\n");
    const res = detectAssessmentFromText(text);
    expect(res.valid).toBe(true);
    expect(res.data?.learningModules.length).toBe(3);
  });

  it("repairs trailing commas and parses successfully", () => {
    const withTrailingCommas = [
      "```json",
      "{",
      '  "level": 3,',
      '  "confidence": 0.9,',
      '  "learningModules": [',
      '    { "id": "m1", "title": "A", "type": "article", "duration": "10 min", },',
      '    { "id": "m2", "title": "B", "type": "article", "duration": "10 min", },',
      '    { "id": "m3", "title": "C", "type": "article", "duration": "10 min" },',
      "  ],",
      "}",
      "```",
    ].join("\n");
    const res = detectAssessmentFromText(withTrailingCommas);
    expect(res.valid).toBe(true);
  });

  it("strips // and /* */ comments before parsing", () => {
    const commented = [
      "```json",
      "{",
      "  // skill is optional",
      '  "level": 2, /* mid */',
      '  "confidence": 0.8,',
      '  "learningModules": [',
      '    { "id": "m1", "title": "A", "type": "article", "duration": "10 min" },',
      '    { "id": "m2", "title": "B", "type": "article", "duration": "10 min" },',
      '    { "id": "m3", "title": "C", "type": "article", "duration": "10 min" }',
      "  ]",
      "}",
      "```",
    ].join("\n");
    const res = detectAssessmentFromText(commented);
    expect(res.valid).toBe(true);
    expect(res.data?.level).toBe(2);
  });
});
