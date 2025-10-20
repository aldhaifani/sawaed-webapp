import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchAction: vi.fn(),
}));

import { fetchAction } from "convex/nextjs";
import { POST as SignOutPOST } from "@/app/api/mobile/auth/signout/route";

function makeRequest(url: string, origin?: string): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      ...(origin ? { Origin: origin } : {}),
    },
  });
}

describe("mobile auth signout route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("signout POST: returns ok true even on backend error", async () => {
    (fetchAction as unknown as Mock).mockRejectedValueOnce(new Error("boom"));
    const res = await SignOutPOST(
      makeRequest("http://localhost/api/mobile/auth/signout"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("signout POST: 403 on CORS mismatch", async () => {
    const res = await SignOutPOST(
      makeRequest(
        "http://localhost/api/mobile/auth/signout",
        "http://evil.com",
      ),
    );
    expect(res.status).toBe(403);
  });
});
