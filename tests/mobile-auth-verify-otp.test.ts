import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchAction: vi.fn(),
}));

import { fetchAction } from "convex/nextjs";
import { POST as VerifyPOST } from "@/app/api/mobile/auth/verify-otp/route";

function makeJsonRequest(url: string, body: unknown, origin?: string): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}

describe("mobile auth verify-otp route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("verify-otp POST: returns tokens on valid code", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({
      tokens: { token: "t1", refreshToken: "r1" },
    });
    const res = await VerifyPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/verify-otp", {
        email: "u@example.com",
        code: "123456",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ token: "t1", refreshToken: "r1" });
  });

  it("verify-otp POST: 400 on invalid/expired code", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({ tokens: null });
    const res = await VerifyPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/verify-otp", {
        email: "u@example.com",
        code: "000000",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("verify-otp POST: 403 on CORS mismatch", async () => {
    const res = await VerifyPOST(
      makeJsonRequest(
        "http://localhost/api/mobile/auth/verify-otp",
        { email: "u@example.com", code: "123456" },
        "http://evil.com",
      ),
    );
    expect(res.status).toBe(403);
  });
});
