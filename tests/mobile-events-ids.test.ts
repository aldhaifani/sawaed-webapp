import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
}));

import { fetchQuery } from "convex/nextjs";
import { GET as EventsListGET } from "@/app/api/mobile/v1/events/route";
import { GET as EventGetGET } from "@/app/api/mobile/v1/events/[id]/route";

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

describe("mobile events defensive id handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("drops invalid regionId/cityId before calling Convex", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    });
    const res = await EventsListGET(
      getRequest(
        "http://localhost/api/mobile/v1/events?regionId=%25%25%25&cityId=%2A%2A%2A&pageSize=5",
      ),
    );
    expect(res.status).toBe(200);
    // Validate Convex was called without invalid IDs
    const calls = (fetchQuery as unknown as Mock).mock.calls;
    expect(calls.length).toBe(1);
    const argsObj = calls[0]?.[1] as any;
    expect(argsObj.regionId).toBeUndefined();
    expect(argsObj.cityId).toBeUndefined();
    expect(argsObj.paginationOpts.numItems).toBe(5);
  });

  it("returns 400 for invalid event id format", async () => {
    const res = await EventGetGET(
      getRequest("http://localhost/api/mobile/v1/events/abc"),
      { params: { id: "abc" } },
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json?.error?.code).toBe("invalid_id");
  });
});
