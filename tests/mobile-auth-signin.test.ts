import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchAction: vi.fn(),
}));

import { fetchAction } from "convex/nextjs";
import { POST as SignInPOST } from "@/app/api/mobile/auth/signin/route";

function makeJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
}

describe("mobile auth signin route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("signin POST: returns tokens on valid credentials", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({
      tokens: { token: "t1", refreshToken: "r1" },
    });
    const res = await SignInPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/signin", {
        email: "u@example.com",
        password: "hunter2",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ token: "t1", refreshToken: "r1" });
  });

  it("signin POST: 401 invalid_credentials when resend-otp preflight fails", async () => {
    // First call (password signIn) returns null tokens
    (fetchAction as unknown as Mock).mockResolvedValueOnce({ tokens: null });
    // Second call (resend-otp) throws -> treated as invalid credentials
    (fetchAction as unknown as Mock).mockRejectedValueOnce(
      new Error("resend failed"),
    );
    const res = await SignInPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/signin", {
        email: "u@example.com",
        password: "wrongpw",
      }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "invalid_credentials",
        message: "Invalid email or password",
      },
    });
  });

  it("signin POST: 403 unverified when resend-otp preflight succeeds", async () => {
    // First call (password signIn) returns null tokens
    (fetchAction as unknown as Mock).mockResolvedValueOnce({ tokens: null });
    // Second call (resend-otp) resolves OK -> user exists but unverified
    (fetchAction as unknown as Mock).mockResolvedValueOnce(undefined);
    const res = await SignInPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/signin", {
        email: "u@example.com",
        password: "hunter2",
      }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({
      error: { code: "unverified", message: "Email not verified" },
    });
  });
});
