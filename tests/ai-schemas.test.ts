import { describe, it, expect } from "vitest";
import { ModuleItemSchema } from "../src/shared/ai/module-item.schema";
import { AssessmentResultSchema } from "../src/shared/ai/assessment-result.schema";
import { parseAssessmentResult } from "../src/shared/ai/assessment-result.sanitize";

describe("ModuleItemSchema", () => {
  it("accepts valid module", () => {
    const res = ModuleItemSchema.safeParse({
      id: "m1",
      title: "Intro",
      type: "video",
      duration: "10 min",
      description: "Learn the basics of video editing",
      objectives: ["Understand video concepts", "Apply editing techniques"],
      outline: ["Introduction", "Basic tools", "Practice exercises"],
    });
    expect(res.success).toBe(true);
  });
  it("rejects invalid duration/type", () => {
    expect(
      ModuleItemSchema.safeParse({
        id: "m1",
        title: "",
        type: "video",
        duration: "10 min",
      }).success,
    ).toBe(false);
    expect(
      ModuleItemSchema.safeParse({
        id: "m1",
        title: "t",
        type: "other",
        duration: "10 min",
      }).success,
    ).toBe(false);
    expect(
      ModuleItemSchema.safeParse({
        id: "m1",
        title: "t",
        type: "video",
        duration: "minutes",
      }).success,
    ).toBe(false);
  });
});

describe("AssessmentResultSchema", () => {
  const valid = {
    level: 1,
    confidence: 0.9,
    learningModules: [
      {
        id: "m1",
        title: "Intro",
        type: "article",
        duration: "6 min",
        description: "Introduction to the topic",
        objectives: ["Learn basics", "Understand concepts"],
        outline: ["Overview", "Key points", "Summary"],
      },
      {
        id: "m2",
        title: "Watch",
        type: "video",
        duration: "1 h",
        description: "Video tutorial on the subject",
        objectives: ["Watch demonstration", "Follow along"],
        outline: ["Setup", "Main content", "Conclusion"],
      },
      {
        id: "m3",
        title: "Quiz",
        type: "quiz",
        duration: "10 min",
        description: "Test your knowledge",
        objectives: ["Apply knowledge", "Check understanding"],
        outline: ["Questions", "Answers", "Review"],
      },
    ],
    reasoning: "ok",
  };
  it("accepts valid result", () => {
    expect(AssessmentResultSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects duplicates and bounds", () => {
    const dup = {
      ...valid,
      learningModules: [
        valid.learningModules[0],
        valid.learningModules[0],
        valid.learningModules[2],
      ],
    };
    expect(AssessmentResultSchema.safeParse(dup).success).toBe(false);
    const tooFew = {
      ...valid,
      learningModules: valid.learningModules.slice(0, 2),
    };
    expect(AssessmentResultSchema.safeParse(tooFew).success).toBe(false);
  });
});

describe("parseAssessmentResult", () => {
  it("returns ok=true for valid", () => {
    const res = parseAssessmentResult({
      level: 2,
      confidence: 0.7,
      learningModules: [
        {
          id: "m1",
          title: "Intro",
          type: "article",
          duration: "6 min",
          description: "Introduction to the topic",
          objectives: ["Learn basics", "Understand concepts"],
          outline: ["Overview", "Key points", "Summary"],
        },
        {
          id: "m2",
          title: "Watch",
          type: "video",
          duration: "1 h",
          description: "Video tutorial on the subject",
          objectives: ["Watch demonstration", "Follow along"],
          outline: ["Setup", "Main content", "Conclusion"],
        },
        {
          id: "m3",
          title: "Quiz",
          type: "quiz",
          duration: "10 min",
          description: "Test your knowledge",
          objectives: ["Apply knowledge", "Check understanding"],
          outline: ["Questions", "Answers", "Review"],
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.level).toBe(2);
  });
  it("returns ok=false with message for invalid", () => {
    const res = parseAssessmentResult({
      level: 2,
      confidence: 2,
      learningModules: [],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.length).toBeGreaterThan(0);
  });
});
