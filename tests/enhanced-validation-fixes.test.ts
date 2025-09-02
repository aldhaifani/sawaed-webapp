import { describe, it, expect } from "vitest";
import { validateModuleItem } from "@/shared/ai/module-item.schema";
import { validateAssessmentResult } from "@/shared/ai/assessment-result.schema";

describe("Enhanced Validation Fixes", () => {
  it("should reject modules with generic single words in searchKeywords", () => {
    const moduleWithGenericWords = {
      id: "test-module",
      title: "التعاون الفعال باستخدام مستندات جوجل",
      description: "تعرف على كيفية استخدام ميزات التعاون في مستندات جوجل",
      type: "article" as const,
      duration: "30 دقائق",
      searchKeywords: [
        "التعاون الفعال باستخدام مستندات جوجل", // Good - specific phrase
        "article", // Bad - generic single word
        "learning", // Bad - generic single word
        "beginner", // Bad - generic single word
      ],
    };

    const result = validateModuleItem(moduleWithGenericWords);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(
      result.errors?.some((error) =>
        error.includes("Search phrases must be specific and meaningful"),
      ),
    ).toBe(true);
  });

  it("should accept modules with only meaningful search phrases", () => {
    const moduleWithGoodPhrases = {
      id: "test-module",
      title: "التعاون الفعال باستخدام مستندات جوجل",
      description: "تعرف على كيفية استخدام ميزات التعاون في مستندات جوجل",
      type: "article" as const,
      duration: "30 دقائق",
      searchKeywords: [
        "التعاون الفعال باستخدام مستندات جوجل",
        "مشاركة المستندات وتعيين الأذونات",
        "التحرير المشترك والتعليقات الرقمية",
      ],
    };

    const result = validateModuleItem(moduleWithGoodPhrases);
    expect(result.success).toBe(true);
  });

  it("should reject assessment with modules containing generic words", () => {
    const assessmentWithGenericWords = {
      level: 7,
      confidence: 0.8,
      reasoning: "Test assessment",
      learningModules: [
        {
          id: "ict-l7-m1",
          title: "التعاون الفعال باستخدام مستندات جوجل",
          description: "تعرف على كيفية استخدام ميزات التعاون",
          type: "article" as const,
          duration: "30 دقائق",
          searchKeywords: [
            "التعاون الفعال باستخدام مستندات جوجل",
            "article", // This should be rejected
            "learning", // This should be rejected
            "beginner", // This should be rejected
          ],
        },
        {
          id: "ict-l8-m1",
          title: "مهارات البحث المتقدم",
          description: "تعلم كيفية البحث بكفاءة على الإنترنت",
          type: "video" as const,
          duration: "45 دقائق",
          searchKeywords: [
            "البحث المتقدم على الإنترنت",
            "تقييم مصداقية المعلومات الرقمية",
            "التحقق من المصادر الموثوقة",
          ],
        },
        {
          id: "ict-l9-m1",
          title: "حماية حساباتك وبياناتك الرقمية",
          description: "تعرف على أفضل الممارسات لحماية حساباتك",
          type: "video" as const,
          duration: "1 ساعة",
          searchKeywords: [
            "حماية حساباتك وبياناتك الرقمية",
            "video", // This should be rejected
            "learning", // This should be rejected
            "beginner", // This should be rejected
          ],
        },
      ],
    };

    const result = validateAssessmentResult(assessmentWithGenericWords);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("should accept assessment with only meaningful search phrases", () => {
    const assessmentWithGoodPhrases = {
      level: 7,
      confidence: 0.8,
      reasoning: "Test assessment with proper phrases",
      learningModules: [
        {
          id: "ict-l7-m1",
          title: "التعاون الفعال باستخدام مستندات جوجل",
          description: "تعرف على كيفية استخدام ميزات التعاون",
          type: "article" as const,
          duration: "30 دقائق",
          searchKeywords: [
            "التعاون الفعال باستخدام مستندات جوجل",
            "مشاركة المستندات وتعيين الأذونات",
            "التحرير المشترك والتعليقات",
          ],
        },
        {
          id: "ict-l8-m1",
          title: "مهارات البحث المتقدم",
          description: "تعلم كيفية البحث بكفاءة على الإنترنت",
          type: "video" as const,
          duration: "45 دقائق",
          searchKeywords: [
            "البحث المتقدم على الإنترنت",
            "تقييم مصداقية المعلومات الرقمية",
            "التحقق من المصادر الموثوقة",
          ],
        },
        {
          id: "ict-l9-m1",
          title: "حماية حساباتك وبياناتك الرقمية",
          description: "تعرف على أفضل الممارسات لحماية حساباتك",
          type: "video" as const,
          duration: "1 ساعة",
          searchKeywords: [
            "حماية حساباتك وبياناتك الرقمية",
            "كلمات المرور القوية والمصادقة الثنائية",
            "ممارسات التصفح الآمن للإنترنت",
          ],
        },
      ],
    };

    const result = validateAssessmentResult(assessmentWithGoodPhrases);
    expect(result.success).toBe(true);
  });
});
