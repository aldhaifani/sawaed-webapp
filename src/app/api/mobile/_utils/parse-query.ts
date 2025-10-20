import type { NextRequest } from "next/server";
import type { z } from "zod";

/**
 * Parse and validate URL search params using a Zod schema.
 */
export function parseQuery<TSchema extends z.ZodType<unknown>>(
  req: Request | NextRequest,
  schema: TSchema,
): z.output<TSchema> {
  const url = new URL(req.url);
  const entries = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(entries as z.input<TSchema>);
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
