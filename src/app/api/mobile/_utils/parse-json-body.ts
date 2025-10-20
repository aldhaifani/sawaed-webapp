import type { NextRequest } from "next/server";
import type { z } from "zod";

export type ParseJsonOptions = {
  readonly maxBytes?: number;
};

/**
 * Parse and validate a JSON request body using a Zod schema.
 * Throws on invalid JSON or schema validation errors.
 */
export async function parseJsonBody<TSchema extends z.ZodType<unknown>>(
  req: Request | NextRequest,
  schema: TSchema,
  options?: ParseJsonOptions,
): Promise<z.output<TSchema>> {
  const maxBytes: number = options?.maxBytes ?? 256 * 1024; // 256KB default
  const text: string = await req.text();
  if (text.length > maxBytes) {
    throw new Error("body_too_large");
  }
  let json: z.input<TSchema>;
  try {
    json = (text ? JSON.parse(text) : {}) as z.input<TSchema>;
  } catch {
    throw new Error("invalid_json");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message: string = first?.message ?? "validation_error";
    const err = new Error(message);
    // @ts-expect-error attach zod issues for callers that want to format
    err.issues = parsed.error.issues;
    throw err;
  }
  return parsed.data as z.output<TSchema>;
}
