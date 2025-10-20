import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchMutation: vi.fn(),
}));

import { fetchMutation } from "convex/nextjs";
import { POST as CancelPOST } from "@/app/api/mobile/v1/events/[id]/cancel/route";

function makeRequest(url: string, token: string = "t"): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
}

describe("mobile events cancel registration route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("cancel POST: cancels existing registration and returns ok", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const res = await CancelPOST(
      makeRequest("http://localhost/api/mobile/v1/events/e1/cancel"),
      { params: { id: "e1" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("cancel POST: maps NOT_REGISTERED to 409", async () => {
    (fetchMutation as unknown as Mock).mockRejectedValueOnce(
      new Error("NOT_REGISTERED"),
    );
    const res = await CancelPOST(
      makeRequest("http://localhost/api/mobile/v1/events/e1/cancel"),
      { params: { id: "e1" } },
    );
    expect(res.status).toBe(409);
  });

  it("cancel POST: 401 when no token", async () => {
    const res = await CancelPOST(
      makeRequest("http://localhost/api/mobile/v1/events/e1/cancel", ""),
      { params: { id: "e1" } },
    );
    expect(res.status).toBe(401);
  });
});
