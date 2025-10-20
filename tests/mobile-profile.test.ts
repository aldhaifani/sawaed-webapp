import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
  fetchAction: vi.fn(),
}));

import { fetchQuery, fetchMutation, fetchAction } from "convex/nextjs";

import { GET as ProfileMeGET } from "@/app/api/mobile/v1/profile/me/route";
import { POST as BasicsPOST } from "@/app/api/mobile/v1/profile/basics/route";
import { POST as PhonePOST } from "@/app/api/mobile/v1/profile/phone/route";
import { POST as GenderPOST } from "@/app/api/mobile/v1/profile/gender/route";
import { GET as UploadUrlGET } from "@/app/api/mobile/v1/profile/picture/upload-url/route";
import { POST as PictureCompletePOST } from "@/app/api/mobile/v1/profile/picture/complete/route";
import { POST as EduPOST } from "@/app/api/mobile/v1/profile/education/route";
import {
  PATCH as EduPATCH,
  DELETE as EduDELETE,
} from "@/app/api/mobile/v1/profile/education/[id]/route";
import { POST as ExpPOST } from "@/app/api/mobile/v1/profile/experience/route";
import {
  PATCH as ExpPATCH,
  DELETE as ExpDELETE,
} from "@/app/api/mobile/v1/profile/experience/[id]/route";
import { POST as ProjPOST } from "@/app/api/mobile/v1/profile/projects/route";
import {
  PATCH as ProjPATCH,
  DELETE as ProjDELETE,
} from "@/app/api/mobile/v1/profile/projects/[id]/route";
import { POST as AwardPOST } from "@/app/api/mobile/v1/profile/awards/route";
import {
  PATCH as AwardPATCH,
  DELETE as AwardDELETE,
} from "@/app/api/mobile/v1/profile/awards/[id]/route";

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
      "accept-language": "en",
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

function patchRequest(
  url: string,
  body: unknown,
  token: string = "t",
): Request {
  return jsonRequest(url, "PATCH", body, token);
}

function deleteRequest(url: string, token: string = "t"): Request {
  return jsonRequest(url, "DELETE", undefined, token);
}

describe("mobile profile routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("profile/me GET: returns composite", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      user: { id: "u1" },
      profile: { headline: "h" },
    });
    const res = await ProfileMeGET(
      getRequest("http://localhost/api/mobile/v1/profile/me?locale=en"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ user: { id: "u1" }, profile: { headline: "h" } });
  });

  it("basics POST: updates basics", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ id: "p1" });
    const res = await BasicsPOST(
      postRequest("http://localhost/api/mobile/v1/profile/basics", {
        headline: "h",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("phone POST: updates phone", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const res = await PhonePOST(
      postRequest("http://localhost/api/mobile/v1/profile/phone", {
        phone: "+968912345678",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("gender POST: updates gender", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const res = await GenderPOST(
      postRequest("http://localhost/api/mobile/v1/profile/gender", {
        gender: "female",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("picture upload-url GET: returns upload url", async () => {
    (fetchAction as unknown as Mock).mockResolvedValueOnce({
      uploadUrl: "https://upload",
    });
    const res = await UploadUrlGET(
      getRequest("http://localhost/api/mobile/v1/profile/picture/upload-url"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ uploadUrl: "https://upload" });
  });

  it("picture complete POST: sets picture by storageId", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const res = await PictureCompletePOST(
      postRequest("http://localhost/api/mobile/v1/profile/picture/complete", {
        storageId: "sid",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("education CRUD works", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ id: "e1" });
    const create = await EduPOST(
      postRequest("http://localhost/api/mobile/v1/profile/education", {
        institution: "i",
        degree: "d",
      }),
    );
    expect(create.status).toBe(200);

    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const update = await EduPATCH(
      patchRequest("http://localhost/api/mobile/v1/profile/education/e1", {
        degree: "d2",
      }),
      { params: { id: "e1" } },
    );
    expect(update.status).toBe(200);

    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const del = await EduDELETE(
      deleteRequest("http://localhost/api/mobile/v1/profile/education/e1"),
      { params: { id: "e1" } },
    );
    expect(del.status).toBe(200);
  });

  it("experience CRUD works", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ id: "x1" });
    const create = await ExpPOST(
      postRequest("http://localhost/api/mobile/v1/profile/experience", {
        title: "t",
        organization: "o",
      }),
    );
    expect(create.status).toBe(200);

    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const update = await ExpPATCH(
      patchRequest("http://localhost/api/mobile/v1/profile/experience/x1", {
        title: "t2",
      }),
      { params: { id: "x1" } },
    );
    expect(update.status).toBe(200);

    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const del = await ExpDELETE(
      deleteRequest("http://localhost/api/mobile/v1/profile/experience/x1"),
      { params: { id: "x1" } },
    );
    expect(del.status).toBe(200);
  });

  it("projects CRUD works", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ id: "p1" });
    const create = await ProjPOST(
      postRequest("http://localhost/api/mobile/v1/profile/projects", {
        title: "t",
      }),
    );
    expect(create.status).toBe(200);

    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const update = await ProjPATCH(
      patchRequest("http://localhost/api/mobile/v1/profile/projects/p1", {
        title: "t2",
      }),
      { params: { id: "p1" } },
    );
    expect(update.status).toBe(200);

    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const del = await ProjDELETE(
      deleteRequest("http://localhost/api/mobile/v1/profile/projects/p1"),
      { params: { id: "p1" } },
    );
    expect(del.status).toBe(200);
  });

  it("awards CRUD works", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ id: "a1" });
    const create = await AwardPOST(
      postRequest("http://localhost/api/mobile/v1/profile/awards", {
        title: "t",
      }),
    );
    expect(create.status).toBe(200);

    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const update = await AwardPATCH(
      patchRequest("http://localhost/api/mobile/v1/profile/awards/a1", {
        title: "t2",
      }),
      { params: { id: "a1" } },
    );
    expect(update.status).toBe(200);

    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const del = await AwardDELETE(
      deleteRequest("http://localhost/api/mobile/v1/profile/awards/a1"),
      { params: { id: "a1" } },
    );
    expect(del.status).toBe(200);
  });
});
