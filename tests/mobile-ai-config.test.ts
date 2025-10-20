import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
}));

import { fetchQuery } from "convex/nextjs";
import { GET as AiConfigGET } from "@/app/api/mobile/v1/ai/config/route";

function getRequest(url: string, token: string = "t"): Request {
  return new Request(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "accept-language": "en",
    },
  });
}

describe("mobile ai config", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns config when available", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      _id: "cfg1",
      userId: "u1",
      aiSkillId: "s1",
      systemPrompt: "p",
      preferredLanguage: "en",
      createdAt: 1,
      updatedAt: 2,
    });
    const res = await AiConfigGET(
      getRequest("http://localhost/api/mobile/v1/ai/config"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ _id: "cfg1", preferredLanguage: "en" });
  });
});
