/**
 * Zod schema for AssessmentResult to validate AI JSON on the client.
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
      ),
  })
  .passthrough(); // Allow extra fields but don't validate them

export type AssessmentResultParsed = z.infer<typeof AssessmentResultSchema>;
