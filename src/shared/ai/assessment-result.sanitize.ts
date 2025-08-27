/**
 * Helpers to validate and sanitize AssessmentResult payloads on the client.
 */
import {
  AssessmentResultSchema,
  type AssessmentResultParsed,
} from "./assessment-result.schema";

export type ParseResult =
  | { readonly ok: true; readonly data: AssessmentResultParsed }
  | { readonly ok: false; readonly error: string };

/**
 * Validate an unknown input against the AssessmentResult schema.
 * Returns a discriminated union to avoid throwing in UI code.
 */
export function parseAssessmentResult(input: unknown): ParseResult {
  const parsed = AssessmentResultSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.errors
      .map((e) => `${e.path.join(".") || "root"}: ${e.message}`)
      .join("; ");
    return { ok: false, error: message } as const;
  }
  return { ok: true, data: parsed.data } as const;
}
