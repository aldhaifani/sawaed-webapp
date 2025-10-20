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

describe("mobile events routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("events list GET: returns paginated items honoring filters", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      items: [{ id: "e1", title: "T" }],
      nextCursor: undefined,
    });
    const res = await EventsListGET(
      getRequest(
        "http://localhost/api/mobile/v1/events?q=tech&regionId=r1&cityId=c1&from=1733812000&to=1733813000&pageSize=10&registrationPolicy=open&isRegistrationRequired=true&allowWaitlist=true&capacityMin=20",
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      items: [{ id: "e1", title: "T" }],
      nextCursor: undefined,
    });
  });

  it("event get GET: returns event by id", async () => {
    const validId = "evt_12345678";
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      id: validId,
      title: "T",
    });
    const res = await EventGetGET(
      getRequest(`http://localhost/api/mobile/v1/events/${validId}?locale=en`),
      { params: { id: validId } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ id: validId, title: "T" });
  });
});
