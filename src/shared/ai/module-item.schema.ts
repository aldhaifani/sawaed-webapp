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
    // Required rich content fields
    description: z.string().min(1).max(2000),
    objectives: z.array(z.string().min(1)).min(2).max(4),
    outline: z.array(z.string().min(1)).min(3).max(5),
    resourceUrl: z.string().url().max(2048).optional(),
    resourceTitle: z.string().min(1).max(200).optional(),
    searchKeywords: z.array(z.string().min(1)).min(1).max(10).optional(),
    levelRef: z.number().int().min(1).max(10).optional(),
    difficulty: z
      .enum(["beginner", "intermediate", "advanced"] as const)
      .optional(),
  })
  .strict();

export type ModuleItemParsed = z.infer<typeof ModuleItemSchema>;
