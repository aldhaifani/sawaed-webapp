/**
 * ModuleItem
 * Shape of a learning module produced by the AI.
 */
import type { ModuleType } from "./module-type";

export type ModuleItem = {
  readonly id: string;
  readonly title: string;
  readonly type: ModuleType;
  readonly duration: string;
};
