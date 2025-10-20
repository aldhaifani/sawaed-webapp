import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
}));

import { fetchQuery, fetchMutation } from "convex/nextjs";

import { GET as StatusGET } from "@/app/api/mobile/v1/onboarding/status/route";
import { GET as DraftGET } from "@/app/api/mobile/v1/onboarding/draft/route";
import { POST as StepPOST } from "@/app/api/mobile/v1/onboarding/step/route";
import { POST as SaveDetailsPOST } from "@/app/api/mobile/v1/onboarding/save-draft-details/route";
import { POST as SaveTaxPOST } from "@/app/api/mobile/v1/onboarding/save-draft-taxonomies/route";
import { POST as CompletePOST } from "@/app/api/mobile/v1/onboarding/complete/route";
import { GET as RegionsGET } from "@/app/api/mobile/v1/locations/regions/route";
import { GET as CitiesGET } from "@/app/api/mobile/v1/locations/cities/route";

function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  token: string = "t",
): Request {
  return new Request(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "accept-language": "ar",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function getRequest(url: string, token: string = "t"): Request {
  return jsonRequest(url, "GET", undefined, token);
}

function postRequest(url: string, body: unknown, token: string = "t"): Request {
  return jsonRequest(url, "POST", body, token);
}

describe("mobile onboarding routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("status GET: returns current step when authenticated", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      completed: false,
      currentStep: "profile",
    });
    const res = await StatusGET(
      getRequest("http://localhost/api/mobile/v1/onboarding/status"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ completed: false, currentStep: "profile" });
  });

  it("draft GET: returns draft object", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      firstNameAr: "أ",
      draftSkillIds: ["s1"],
    });
    const res = await DraftGET(
      getRequest("http://localhost/api/mobile/v1/onboarding/draft?locale=ar"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ firstNameAr: "أ", draftSkillIds: ["s1"] });
  });

  it("step POST: sets step via mutation", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce(true);
    const res = await StepPOST(
      postRequest("http://localhost/api/mobile/v1/onboarding/step", {
        step: "skills",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("save-draft-details POST: saves bilingual details and gender", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce(true);
    const res = await SaveDetailsPOST(
      postRequest(
        "http://localhost/api/mobile/v1/onboarding/save-draft-details",
        {
          firstNameAr: "أ",
          lastNameAr: "ب",
          firstNameEn: "A",
          lastNameEn: "B",
          gender: "male",
          region: "Muscat",
          city: "Muscat",
        },
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("save-draft-taxonomies POST: saves skills and interests", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce(true);
    const res = await SaveTaxPOST(
      postRequest(
        "http://localhost/api/mobile/v1/onboarding/save-draft-taxonomies",
        { skillIds: ["s1"], interestIds: ["i1"] },
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("complete POST: validates draft and completes flow", async () => {
    // qGetDraft
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      firstNameAr: "أ",
      lastNameAr: "ب",
      firstNameEn: "A",
      lastNameEn: "B",
      gender: "male",
      city: "Muscat",
      region: "Muscat",
      draftSkillIds: ["s1"],
      draftInterestIds: ["i1"],
    });
    // mUpsert, mSetTax, mComplete
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({
      skills: 1,
      interests: 1,
    });
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });

    const res = await CompletePOST(
      postRequest("http://localhost/api/mobile/v1/onboarding/complete", {}),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("regions GET: returns list of regions honoring locale", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce([
      { id: "r1", name: "مسقط" },
    ]);
    const res = await RegionsGET(
      getRequest("http://localhost/api/mobile/v1/locations/regions?locale=ar"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ items: [{ id: "r1", name: "مسقط" }] });
  });

  it("cities GET: returns list of cities filtered by regionId", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce([
      { id: "c1", name: "مسقط" },
    ]);
    const res = await CitiesGET(
      getRequest(
        "http://localhost/api/mobile/v1/locations/cities?regionId=r1&locale=ar",
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ items: [{ id: "c1", name: "مسقط" }] });
  });
});
