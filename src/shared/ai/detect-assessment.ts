import { AssessmentResultSchema } from "./assessment-result.schema";
import type { AssessmentResultParsed } from "./assessment-result.schema";
import * as Sentry from "@sentry/nextjs";

export type DetectResult = {
  readonly valid: boolean;
  readonly data?: AssessmentResultParsed;
};

/**
 * Detects, normalizes, and validates an assessment JSON object embedded in free-form text.
 * - Prefers fenced ```json code blocks
 * - Falls back to extracting the largest {...} substring
 * - Normalizes PRD-style `modules` to `learningModules`
 */
export function detectAssessmentFromText(text: string): DetectResult {
  return Sentry.startSpan(
    { op: "ai.detect", name: "detectAssessmentFromText" },
    () => {
      if (!text || typeof text !== "string") return { valid: false };
      const candidates: string[] = [];
      const fencedMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
      const fencedBody = fencedMatch?.[1];
      if (typeof fencedBody === "string" && fencedBody.length > 0) {
        candidates.push(fencedBody);
        Sentry.addBreadcrumb({
          category: "ai.detect",
          level: "info",
          message: "fenced json candidate detected",
          data: { length: fencedBody.length },
        });
      }
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const raw = text.slice(firstBrace, lastBrace + 1);
        candidates.push(raw);
        Sentry.addBreadcrumb({
          category: "ai.detect",
          level: "info",
          message: "raw braces candidate detected",
          data: { length: raw.length },
        });
      }
      for (const raw of candidates) {
        try {
          // JSON.parse result is treated as unknown and validated via Zod
          const parsedUnknown = JSON.parse(raw) as unknown;
          const normalized: unknown = (() => {
            if (parsedUnknown === null || typeof parsedUnknown !== "object") {
              return parsedUnknown;
            }
            const p = parsedUnknown as Record<string, unknown>;
            const pObj = p as Record<string, unknown> & {
              learningModules?: unknown;
              modules?: unknown;
            };
            const hasLearning = Array.isArray(pObj?.learningModules);
            const hasModules = Array.isArray(pObj?.modules);
            if (hasLearning) {
              return { ...p };
            }
            if (hasModules) {
              // Map modules -> learningModules and drop modules to satisfy .strict()
              const { modules, ...rest } = pObj;
              Sentry.addBreadcrumb({
                category: "ai.detect",
                level: "info",
                message: "normalized modules -> learningModules",
                data: {
                  modulesCount: Array.isArray(modules)
                    ? modules.length
                    : undefined,
                },
              });
              return { ...rest, learningModules: modules };
            }
            return p;
          })();
          const safe = AssessmentResultSchema.safeParse(normalized);
          if (safe.success) {
            return { valid: true, data: safe.data };
          }
          Sentry.addBreadcrumb({
            category: "ai.detect",
            level: "debug",
            message: "schema validation failed",
          });
        } catch {
          // ignore and try next candidate
        }
      }
      return { valid: false };
    },
  );
}
