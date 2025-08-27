/**
 * AssessmentResult
 * Structured result expected from the AI for a skill assessment.
 */
import type { ModuleItem } from "./module-item";

export type AssessmentResult = {
  readonly level: number;
  readonly confidence: number; // 0..1
  readonly reasoning?: string;
  readonly learningModules: ReadonlyArray<ModuleItem>;
};
