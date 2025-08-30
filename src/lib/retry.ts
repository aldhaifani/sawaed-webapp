/**
 * Lightweight async retry with exponential backoff and jitter.
 * - Default attempts: 3
 * - Base delay: 250ms, factor: 2, jitter: 0.2 (20%)
 * - Retry only on errors that are likely transient unless overridden via shouldRetry
 */
export type RetryOptions = {
  readonly attempts?: number;
  readonly baseDelayMs?: number;
  readonly factor?: number;
  readonly jitterRatio?: number; // 0..1
  readonly signal?: AbortSignal;
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
  readonly onAttempt?: (meta: {
    readonly attempt: number; // 1-based
    readonly delayMs: number;
    readonly error: unknown;
  }) => void;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function defaultShouldRetry(error: unknown): boolean {
  if (!error) return true;
  const msg =
    typeof error === "string" ? error : ((error as Error)?.message ?? "");
  const lower = msg.toLowerCase();
  // Heuristics for transient failures
  return (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("rate") ||
    lower.includes("429") ||
    lower.includes("5xx") ||
    lower.includes("internal server error") ||
    lower.includes("econn") ||
    lower.includes("network") ||
    lower.includes("fetch failed")
  );
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const base = Math.max(1, opts.baseDelayMs ?? 250);
  const factor = Math.max(1, opts.factor ?? 2);
  const jitter = Math.min(1, Math.max(0, opts.jitterRatio ?? 0.2));
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;

  let attempt = 0;
  let delay = base;
  let lastErr: unknown = undefined;
  while (attempt < attempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= attempts || !shouldRetry(err, attempt)) {
        throw err;
      }
      const jitterMs = delay * (Math.random() * 2 * jitter - jitter); // +/- jitter
      const wait = Math.max(0, Math.floor(delay + jitterMs));
      opts.onAttempt?.({ attempt, delayMs: wait, error: err });
      await sleep(wait, opts.signal);
      delay = delay * factor;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("retry_failed");
}
