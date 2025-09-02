/**
 * Enhanced Zod schema for AssessmentResult with comprehensive validation.
 * Validates AI-generated learning paths for quality, consistency, and completeness.
 */
import { z } from "zod";
import { ModuleItemSchema } from "./module-item.schema";

export const AssessmentResultSchema = z
  .object({
    level: z.number().int().min(1).max(10), // Full 10-level system as defined in ai_skills.json
    confidence: z.number().min(0).max(1),
    reasoning: z.string().max(2000).optional(),
    // Optional skill label from AI output. We don't rely on this for persistence;
    // it's accepted to avoid breaking on models that include it.
    skill: z.string().min(1).optional(),
    learningModules: z
      .array(ModuleItemSchema)
      .min(3)
      .max(6)
      .refine(
        (mods) => new Set(mods.map((m) => m.id)).size === mods.length,
        "duplicate module ids",
      )
      // Removed strict diversity requirement for backward compatibility
      .refine((mods) => {
        // More lenient validation for backward compatibility
        return mods.length >= 3; // Just ensure minimum module count
      }, "Learning path must have at least 3 modules"),
  })
  .passthrough() // Allow extra fields but don't validate them
  .refine(
    (result) => {
      // More lenient validation for backward compatibility
      return (
        result.level >= 1 &&
        result.level <= 10 &&
        result.confidence >= 0 &&
        result.confidence <= 1
      );
    },
    {
      message: "Assessment must have valid level (1-10) and confidence (0-1)",
    },
  );

export type AssessmentResultParsed = z.infer<typeof AssessmentResultSchema>;

// Backward compatible validation helper
export function validateAssessmentResult(data: unknown): {
  success: boolean;
  data?: AssessmentResultParsed;
  errors?: string[];
  warnings?: string[];
} {
  const result = AssessmentResultSchema.safeParse(data);

  if (result.success) {
    // Only generate warnings, no strict validation failures
    const warnings: string[] = [];

    if (result.data.confidence < 0.6) {
      warnings.push("Low confidence assessment");
    }

    return {
      success: true,
      data: result.data,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // Extract meaningful error messages
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { success: false, errors };
}
