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
  })
  .strict();

export type ModuleItemParsed = z.infer<typeof ModuleItemSchema>;
