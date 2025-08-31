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
      // 1) Collect all fenced code blocks first (prefer JSON-labeled)
      const fencedRe = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
      let m: RegExpExecArray | null;
      let fencedCount = 0;
      while ((m = fencedRe.exec(text)) !== null) {
        const body = m[1];
        if (typeof body === "string" && body.length > 0) {
          candidates.push(body);
          fencedCount++;
        }
      }
      if (fencedCount > 0) {
        Sentry.addBreadcrumb({
          category: "ai.detect",
          level: "info",
          message: "fenced json candidates detected",
          data: { count: fencedCount },
        });
      }
      // 2) Fallback to largest {...} slice if present
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

      // Lightweight pre-processing to improve JSON.parse success on common model artifacts
      const preprocess = (src: string): string => {
        let s = src;
        // Remove // line comments
        s = s.replace(/(^|\s)\/\/.*$/gm, "");
        // Remove /* */ block comments
        s = s.replace(/\/\*[\s\S]*?\*\//g, "");
        // Remove trailing commas in objects and arrays
        s = s.replace(/,\s*(\]|\})/g, "$1");
        return s.trim();
      };

      for (const raw of candidates) {
        const source = raw.slice(0, 5000); // cap to avoid huge strings
        try {
          const prepared = preprocess(source);
          const parsedUnknown = JSON.parse(prepared) as unknown;
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
            const normalizeMods = (
              arr: unknown[],
            ): {
              id: string;
              title: string;
              type: string;
              duration: string;
            }[] => {
              return arr
                .filter(
                  (m): m is Record<string, unknown> =>
                    typeof m === "object" && m !== null,
                )
                .map((mm, idx) => {
                  const idRaw = mm.id;
                  const titleRaw = mm.title;
                  const typeRaw = mm.type;
                  const durationRaw = mm.duration;
                  const durationMinRaw = (mm as { durationMin?: unknown })
                    .durationMin;
                  const id =
                    typeof idRaw === "string" && idRaw.trim().length > 0
                      ? idRaw
                      : `m${idx + 1}`;
                  const title =
                    typeof titleRaw === "string" && titleRaw.trim().length > 0
                      ? titleRaw
                      : `Module ${idx + 1}`;
                  const type =
                    typeof typeRaw === "string" ? typeRaw : "article";
                  const durationLabel =
                    typeof durationRaw === "string" &&
                    durationRaw.trim().length > 0
                      ? durationRaw
                      : typeof durationMinRaw === "number" &&
                          Number.isFinite(durationMinRaw)
                        ? `${Math.max(1, Math.round(durationMinRaw))} min`
                        : "10 min";
                  return { id, title, type, duration: durationLabel };
                });
            };
            const buildResult = (
              base: Record<string, unknown>,
              mods: {
                id: string;
                title: string;
                type: string;
                duration: string;
              }[],
            ): Record<string, unknown> => {
              const level =
                typeof base.level === "number" ? base.level : undefined;
              const confidence =
                typeof base.confidence === "number"
                  ? base.confidence
                  : undefined;
              const baseObj = base as Record<string, unknown> & {
                reasoning?: unknown;
                rationale?: unknown;
                skill?: unknown;
              };
              const reasoningUnknown = baseObj.reasoning ?? baseObj.rationale;
              const reasoning =
                typeof reasoningUnknown === "string"
                  ? reasoningUnknown
                  : undefined;
              const skillUnknown = baseObj.skill;
              const skill =
                typeof skillUnknown === "string" ? skillUnknown : undefined;
              return {
                ...(level !== undefined ? { level } : {}),
                ...(confidence !== undefined ? { confidence } : {}),
                ...(reasoning !== undefined ? { reasoning } : {}),
                ...(skill !== undefined ? { skill } : {}),
                learningModules: mods,
              };
            };
            if (hasLearning) {
              const lm = Array.isArray(pObj.learningModules)
                ? (pObj.learningModules as unknown[])
                : [];
              const mods = normalizeMods(lm);
              return buildResult(p, mods);
            }
            if (hasModules) {
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
              const rawMods = Array.isArray(modules)
                ? (modules as unknown[])
                : [];
              const mods = normalizeMods(rawMods);
              return buildResult(rest as Record<string, unknown>, mods);
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
        } catch (e) {
          Sentry.captureException(e);
          Sentry.addBreadcrumb({
            category: "ai.detect",
            level: "debug",
            message: "candidate parse failed",
          });
        }
      }
      return { valid: false };
    },
  );
}
