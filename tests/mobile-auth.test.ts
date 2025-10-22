import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchAction: vi.fn(),
}));

import { fetchAction } from "convex/nextjs";

import { POST as RequestOtpPOST } from "@/app/api/mobile/auth/request-otp/route";
import { POST as VerifyOtpPOST } from "@/app/api/mobile/auth/verify-otp/route";
import { POST as RefreshPOST } from "@/app/api/mobile/auth/refresh/route";
import { POST as SignoutPOST } from "@/app/api/mobile/auth/signout/route";

function makeJsonRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
  });
}

describe("mobile auth routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("request-otp: returns ok on happy path", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce(undefined);
    const req = makeJsonRequest(
      "http://localhost/api/mobile/auth/request-otp",
      { email: "user@example.com" },
    );
    const res = await RequestOtpPOST(req as unknown as Request);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, code: "user_unverified" });
  });

  it("request-otp: blocks CORS with 403", async () => {
    const req = makeJsonRequest(
      "http://localhost/api/mobile/auth/request-otp",
      { email: "user@example.com" },
      { Origin: "https://evil.example.com" },
    );
    const res = await RequestOtpPOST(req as unknown as Request);
    expect(res.status).toBe(403);
  });

  it("verify-otp: returns tokens on valid code", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({
      tokens: { token: "t", refreshToken: "r" },
    });
    const req = makeJsonRequest("http://localhost/api/mobile/auth/verify-otp", {
      email: "user@example.com",
      code: "123456",
    });
    const res = await VerifyOtpPOST(req as unknown as Request);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ token: "t", refreshToken: "r" });
  });

  it("verify-otp: enforces 6-digit code validation", async () => {
    const req = makeJsonRequest("http://localhost/api/mobile/auth/verify-otp", {
      email: "user@example.com",
      code: "123",
    });
    const res = await VerifyOtpPOST(req as unknown as Request);
    expect(res.status).toBe(400);
  });

  it("verify-otp: returns 400 on invalid code result", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({ tokens: null });
    const req = makeJsonRequest("http://localhost/api/mobile/auth/verify-otp", {
      email: "user@example.com",
      code: "123456",
    });
    const res = await VerifyOtpPOST(req as unknown as Request);
    expect(res.status).toBe(400);
  });

  it("refresh: returns tokens on valid refresh", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({
      tokens: { token: "t2", refreshToken: "r2" },
    });
    const req = makeJsonRequest("http://localhost/api/mobile/auth/refresh", {
      refreshToken: "r2",
    });
    const res = await RefreshPOST(req as unknown as Request);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ token: "t2", refreshToken: "r2" });
  });

  it("refresh: returns 400 on invalid refresh", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({ tokens: null });
    const req = makeJsonRequest("http://localhost/api/mobile/auth/refresh", {
      refreshToken: "bad",
    });
    const res = await RefreshPOST(req as unknown as Request);
    expect(res.status).toBe(400);
  });

  it("signout: returns ok true even if backend errors", async () => {
    (fetchAction as unknown as Mock).mockRejectedValueOnce(new Error("boom"));
    const req = makeJsonRequest("http://localhost/api/mobile/auth/signout", {});
    const res = await SignoutPOST(req as unknown as Request);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });
});
