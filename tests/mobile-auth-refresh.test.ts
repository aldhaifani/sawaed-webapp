import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchAction: vi.fn(),
}));

import { fetchAction } from "convex/nextjs";
import { POST as RefreshPOST } from "@/app/api/mobile/auth/refresh/route";

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

describe("mobile auth refresh route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("refresh POST: returns tokens on valid refresh token", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({
      tokens: { token: "t2", refreshToken: "r2" },
    });
    const res = await RefreshPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/refresh", {
        refreshToken: "r1",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ token: "t2", refreshToken: "r2" });
  });

  it("refresh POST: 400 on invalid/expired refresh token", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({ tokens: null });
    const res = await RefreshPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/refresh", {
        refreshToken: "bad",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("refresh POST: 403 on CORS mismatch", async () => {
    const res = await RefreshPOST(
      makeJsonRequest(
        "http://localhost/api/mobile/auth/refresh",
        { refreshToken: "r1" },
        "http://evil.com",
      ),
    );
    expect(res.status).toBe(403);
  });
});
