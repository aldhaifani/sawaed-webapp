import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchAction: vi.fn(),
}));

import { fetchAction } from "convex/nextjs";
import { POST as SignUpPOST } from "@/app/api/mobile/auth/signup/route";

function makeJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

describe("mobile auth signup route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("signup POST: returns ok true on success", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce(undefined);
    const res = await SignUpPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/signup", {
        email: "u@example.com",
        password: "hunter2",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("signup POST: 409 email_already_exists on duplicate email", async () => {
    (fetchAction as unknown as Mock).mockRejectedValueOnce(
      new Error("Email already exists"),
    );
    const res = await SignUpPOST(
      makeJsonRequest("http://localhost/api/mobile/auth/signup", {
        email: "u@example.com",
        password: "hunter2",
      }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({
      error: { code: "email_already_exists", message: "Email already in use" },
    });
  });
});
