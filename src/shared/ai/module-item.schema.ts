/**
 * ModuleItem Zod schema for validating AI learning modules on the client.
 */
import { z } from "zod";
import { ALLOWED_MODULE_TYPES, DURATION_REGEX } from "./constants";

export const ModuleItemSchema = z
  .object({
    id: z.string().min(1, "id is required"),
    title: z.string().min(1, "title is required"),
    type: z.enum(ALLOWED_MODULE_TYPES),
    duration: z
      .string()
      .min(1, "duration is required")
      .refine((v) => {
        const val = v.trim();
        if (DURATION_REGEX.test(val)) return true;
        if (!/\d/.test(val)) return false;
        return val.length <= 32;
      }, "invalid duration label"),
    // Rich content fields (optional for backward compatibility)
    description: z.string().min(1).max(2000).optional(),
    objectives: z.array(z.string().min(1)).min(2).max(4).optional(),
    outline: z.array(z.string().min(1)).min(3).max(5).optional(),
    resourceUrl: z.string().url().max(2048).optional(),
    resourceTitle: z.string().min(1).max(200).optional(),
    searchKeywords: z
      .array(
        z
          .string()
          .min(3, "Search phrases must be at least 3 characters")
          .max(50, "Search phrases must be under 50 characters")
          .refine((phrase) => {
            // Prevent single words - require at least 2 words or meaningful phrases
            const words = phrase.trim().split(/\s+/);
            if (words.length === 1) {
              // Allow single technical terms that are compound or specific
              return phrase.length > 8 || /[\u0600-\u06FF]/.test(phrase); // Arabic or long technical terms
            }
            return words.length >= 2;
          }, "Search phrases should be meaningful phrases, not single words")
          .refine((phrase) => {
            // Prevent generic terms - expanded list with stricter matching
            const genericTerms = [
              "project",
              "tutorial",
              "course",
              "lesson",
              "video",
              "article",
              "guide",
              "beginner",
              "intermediate",
              "advanced",
              "basic",
              "introduction",
              "learning",
              "education",
              "training",
              "study",
              "practice",
              "exercise",
              "content",
              "material",
              "resource",
              "module",
              "unit",
              "chapter",
              "section",
              "مشروع",
              "درس",
              "دورة",
              "فيديو",
              "مقال",
              "دليل",
              "مبتدئ",
              "متقدم",
              "أساسي",
              "مقدمة",
              "تعلم",
              "تعليم",
              "تدريب",
              "دراسة",
              "ممارسة",
              "تمرين",
              "محتوى",
              "مادة",
              "مورد",
              "وحدة",
              "فصل",
              "قسم",
            ];
            const lowerPhrase = phrase.toLowerCase().trim();

            // Check if phrase is exactly a generic term or contains only generic terms
            const isGeneric = genericTerms.some((term) => {
              const lowerTerm = term.toLowerCase();
              return (
                lowerPhrase === lowerTerm ||
                lowerPhrase
                  .split(/\s+/)
                  .every((word) =>
                    genericTerms.some((gt) => gt.toLowerCase() === word),
                  )
              );
            });

            return !isGeneric;
          }, "Search phrases must be specific and meaningful, avoid generic terms like 'tutorial', 'beginner', 'learning', etc."),
      )
      .min(1)
      .max(8)
      .optional(),
    levelRef: z.number().int().min(1).max(10).optional(),
    difficulty: z
      .enum(["beginner", "intermediate", "advanced"] as const)
      .optional(),
  })
  .strict()
  .refine(
    (module) => {
      // Enhanced validation: if searchKeywords exist, ensure they're contextually relevant
      if (module.searchKeywords && module.searchKeywords.length > 0) {
        const contentWords = [
          ...(module.title?.toLowerCase().split(/\s+/) ?? []),
          ...(module.description?.toLowerCase().split(/\s+/) ?? []),
        ];

        // At least one search keyword should relate to the module content
        const hasRelevantKeyword = module.searchKeywords.some((keyword) => {
          const keywordWords = keyword.toLowerCase().split(/\s+/);
          return keywordWords.some((word) =>
            contentWords.some(
              (contentWord) =>
                contentWord.includes(word) || word.includes(contentWord),
            ),
          );
        });

        if (!hasRelevantKeyword) {
          return false;
        }
      }

      // Allow modules without resourceUrl or searchKeywords for backward compatibility
      // This validation is more lenient to support existing test data

      return true;
    },
    {
      message: "Search keywords should relate to module content when provided",
    },
  );

export type ModuleItemParsed = z.infer<typeof ModuleItemSchema>;

// Enhanced validation helper for better error messages
export function validateModuleItem(data: unknown): {
  success: boolean;
  data?: ModuleItemParsed;
  errors?: string[];
} {
  const result = ModuleItemSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Extract meaningful error messages
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { success: false, errors };
}
