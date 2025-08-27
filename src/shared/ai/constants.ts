/**
 * Constants used by AI learning path validation.
 */
export const ALLOWED_MODULE_TYPES = [
  "article",
  "video",
  "quiz",
  "project",
] as const;
export const MIN_MODULES = 3 as const;
export const MAX_MODULES = 6 as const;
export const MAX_REASONING_LEN = 2000 as const;
// e.g., "6 min", "15 mins", "1 h", "2 hours" (human-readable)
export const DURATION_REGEX =
  /^(\d{1,3})\s?(min|mins|minutes|h|hr|hrs|hour|hours)$/i;
