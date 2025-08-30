import { describe, it, expect } from "vitest";
import { retryAsync } from "@/lib/retry";

describe("retryAsync", () => {
  it("retries transient failures then succeeds", async () => {
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls += 1;
      if (calls < 3) {
        throw new Error("network timeout");
      }
      return "ok";
    };
    const result = await retryAsync(fn, { attempts: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry non-transient error by default", async () => {
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls += 1;
      throw new Error("validation failed");
    };
    await expect(
      retryAsync(fn, { attempts: 3, baseDelayMs: 1 }),
    ).rejects.toThrow(/validation failed/);
    expect(calls).toBe(1);
  });

  it("respects custom shouldRetry", async () => {
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls += 1;
      if (calls < 2) throw new Error("boom");
      return "ok";
    };
    const result = await retryAsync(fn, {
      attempts: 2,
      baseDelayMs: 1,
      shouldRetry: () => true,
    });
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });
});
