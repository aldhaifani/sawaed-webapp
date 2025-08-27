import { describe, it, expect } from "vitest";
import {
  assertValidAssessmentResult,
  assertValidConfidence,
  assertValidDurationLabel,
  assertValidLearningPathProgress,
  assertValidModules,
  assertValidSkillLevels,
  type AssessmentResult,
  type ModuleItem,
} from "../convex/validators";

const sampleModule = (overrides: Partial<ModuleItem> = {}): ModuleItem => ({
  id: "m1",
  title: "Intro",
  type: "article",
  duration: "6 min",
  ...overrides,
});

const sampleModules = (n: number): ModuleItem[] =>
  Array.from({ length: n }, (_, i) => sampleModule({ id: `m${i + 1}` }));

const allowedLevels = new Set<number>([1, 2, 3, 4, 5]);

describe("validators.assertValidConfidence", () => {
  it("accepts 0..1", () => {
    expect(() => assertValidConfidence(0)).not.toThrow();
    expect(() => assertValidConfidence(1)).not.toThrow();
    expect(() => assertValidConfidence(0.5)).not.toThrow();
  });
  it("rejects out of range", () => {
    expect(() => assertValidConfidence(-0.1)).toThrow();
    expect(() => assertValidConfidence(1.1)).toThrow();
    expect(() => assertValidConfidence(Number.NaN)).toThrow();
  });
});

describe("validators.assertValidDurationLabel", () => {
  it("accepts common patterns", () => {
    ["6 min", "15 mins", "1 h", "2 hours", "10min"].forEach((d) =>
      expect(() => assertValidDurationLabel(d)).not.toThrow(),
    );
  });
  it("rejects without digits or too long", () => {
    expect(() => assertValidDurationLabel("minutes")).toThrow();
    expect(() => assertValidDurationLabel("x".repeat(40))).toThrow();
  });
});

describe("validators.assertValidModules", () => {
  it("accepts 3..6 unique modules with valid fields", () => {
    expect(() => assertValidModules(sampleModules(3))).not.toThrow();
    expect(() => assertValidModules(sampleModules(6))).not.toThrow();
  });
  it("rejects invalid count", () => {
    expect(() => assertValidModules(sampleModules(2))).toThrow();
    expect(() => assertValidModules(sampleModules(7))).toThrow();
  });
  it("rejects duplicate ids", () => {
    const mods = [
      sampleModule({ id: "m1" }),
      sampleModule({ id: "m1" }),
      sampleModule({ id: "m2" }),
    ];
    expect(() => assertValidModules(mods)).toThrow();
  });
  it("rejects invalid type", () => {
    // @ts-expect-error testing invalid type
    const mods: ModuleItem[] = [
      sampleModule({ type: "invalid" }),
      sampleModule({ id: "m2" }),
      sampleModule({ id: "m3" }),
    ];
    expect(() => assertValidModules(mods)).toThrow();
  });
});

describe("validators.assertValidAssessmentResult", () => {
  it("accepts valid result", () => {
    const result: AssessmentResult = {
      level: 2,
      confidence: 0.8,
      learningModules: sampleModules(3),
      reasoning: "ok",
    };
    expect(() =>
      assertValidAssessmentResult(result, allowedLevels),
    ).not.toThrow();
  });
  it("rejects invalid level or confidence", () => {
    const badLevel: AssessmentResult = {
      level: 10,
      confidence: 0.9,
      learningModules: sampleModules(3),
    };
    expect(() =>
      assertValidAssessmentResult(badLevel, allowedLevels),
    ).toThrow();

    const badConfidence: AssessmentResult = {
      level: 1,
      confidence: 2,
      learningModules: sampleModules(3),
    };
    expect(() =>
      assertValidAssessmentResult(badConfidence, allowedLevels),
    ).toThrow();
  });
  it("rejects too long reasoning", () => {
    const tooLong: AssessmentResult = {
      level: 1,
      confidence: 0.5,
      learningModules: sampleModules(3),
      reasoning: "x".repeat(3000),
    };
    expect(() => assertValidAssessmentResult(tooLong, allowedLevels)).toThrow();
  });
});

describe("validators.assertValidLearningPathProgress", () => {
  it("accepts subset of ids without duplicates", () => {
    const mods = sampleModules(4);
    const ids = [mods[0]!.id, mods[2]!.id];
    expect(() => assertValidLearningPathProgress(mods, ids)).not.toThrow();
  });
  it("rejects ids not in modules or duplicates", () => {
    const mods = sampleModules(3);
    expect(() => assertValidLearningPathProgress(mods, ["x"])).toThrow();
    expect(() =>
      assertValidLearningPathProgress(mods, [mods[0]!.id, mods[0]!.id]),
    ).toThrow();
  });
});

describe("validators.assertValidSkillLevels", () => {
  it("accepts strictly increasing unique levels with names and descriptions", () => {
    expect(() =>
      assertValidSkillLevels([
        {
          level: 1,
          nameEn: "A",
          nameAr: "أ",
          descriptionEn: "d",
          descriptionAr: "و",
        },
        {
          level: 2,
          nameEn: "B",
          nameAr: "ب",
          descriptionEn: "d",
          descriptionAr: "و",
        },
      ]),
    ).not.toThrow();
  });
  it("rejects duplicates or non-increasing", () => {
    expect(() =>
      assertValidSkillLevels([
        {
          level: 1,
          nameEn: "A",
          nameAr: "أ",
          descriptionEn: "d",
          descriptionAr: "و",
        },
        {
          level: 1,
          nameEn: "B",
          nameAr: "ب",
          descriptionEn: "d",
          descriptionAr: "و",
        },
      ]),
    ).toThrow();
    expect(() =>
      assertValidSkillLevels([
        {
          level: 2,
          nameEn: "A",
          nameAr: "أ",
          descriptionEn: "d",
          descriptionAr: "و",
        },
        {
          level: 2,
          nameEn: "B",
          nameAr: "ب",
          descriptionEn: "d",
          descriptionAr: "و",
        },
      ]),
    ).toThrow();
    expect(() =>
      assertValidSkillLevels([
        {
          level: 2,
          nameEn: "A",
          nameAr: "أ",
          descriptionEn: "d",
          descriptionAr: "و",
        },
        {
          level: 1,
          nameEn: "B",
          nameAr: "ب",
          descriptionEn: "d",
          descriptionAr: "و",
        },
      ]),
    ).toThrow();
  });
});
