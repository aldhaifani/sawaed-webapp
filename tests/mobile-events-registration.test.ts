import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchMutation: vi.fn(),
}));

import { fetchMutation } from "convex/nextjs";
import { POST as RegisterPOST } from "@/app/api/mobile/v1/events/[id]/register/route";

function makeJsonRequest(
  url: string,
  body: unknown,
  token: string = "t",
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
}

describe("mobile events registration route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("register POST: applies to event and returns result", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({
      id: "reg1",
      status: "accepted",
    });
    const res = await RegisterPOST(
      makeJsonRequest("http://localhost/api/mobile/v1/events/e1/register", {
        quantity: 2,
        notes: "n",
      }),
      { params: { id: "e1" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ id: "reg1", status: "accepted" });
  });

  it("register POST: maps known domain errors to 409", async () => {
    (fetchMutation as unknown as Mock).mockRejectedValueOnce(
      new Error("ALREADY_REGISTERED"),
    );
    const res = await RegisterPOST(
      makeJsonRequest("http://localhost/api/mobile/v1/events/e1/register", {}),
      { params: { id: "e1" } },
    );
    expect(res.status).toBe(409);
  });

  it("register POST: 401 when no bearer token", async () => {
    const res = await RegisterPOST(
      makeJsonRequest(
        "http://localhost/api/mobile/v1/events/e1/register",
        {},
        "",
      ),
      { params: { id: "e1" } },
    );
    expect(res.status).toBe(401);
  });
});
