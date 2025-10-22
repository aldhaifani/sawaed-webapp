import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchAction: vi.fn(),
}));

import { fetchAction } from "convex/nextjs";
import { POST as RequestOtpPOST } from "@/app/api/mobile/auth/request-otp/route";

function makeJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

describe("mobile auth request-otp route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("request-otp POST: returns ok true with user_unverified code on success", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce(undefined);
    const res = await RequestOtpPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/request-otp", {
        email: "u@example.com",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, code: "user_unverified" });
  });

  it("request-otp POST: 400 request_otp_failed on provider error", async () => {
    (fetchAction as unknown as Mock).mockRejectedValueOnce(
      new Error("provider error"),
    );
    const res = await RequestOtpPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/request-otp", {
        email: "u@example.com",
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({
      error: { code: "request_otp_failed", message: "provider error" },
    });
  });

  it("request-otp POST: 409 user_exists when provider indicates existing verified user", async () => {
    (fetchAction as unknown as Mock).mockRejectedValueOnce(
      new Error("User already verified"),
    );
    const res = await RequestOtpPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/request-otp", {
        email: "u@example.com",
      }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({
      error: { code: "user_exists", message: "User already exists" },
    });
  });

  it("request-otp POST: 200 ok when provider indicates user not found", async () => {
    (fetchAction as unknown as Mock).mockRejectedValueOnce(
      new Error("User not found"),
    );
    const res = await RequestOtpPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/request-otp", {
        email: "nouser@example.com",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });
});
