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

  it("signin POST: 401 on invalid credentials or unverified", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({ tokens: null });
    const res = await SignInPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/signin", {
        email: "u@example.com",
        password: "wrongpw",
      }),
    );
    expect(res.status).toBe(401);
  });
});
