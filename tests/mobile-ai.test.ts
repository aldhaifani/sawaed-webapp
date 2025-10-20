import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
}));

import { fetchQuery, fetchMutation } from "convex/nextjs";

import {
  GET as AiConfigGET,
  POST as AiConfigPOST,
} from "@/app/api/mobile/v1/ai/config/route";
import { GET as AiPathActiveGET } from "@/app/api/mobile/v1/ai/path/active/route";
import { GET as AiPathBySkillGET } from "@/app/api/mobile/v1/ai/path/route";
import { POST as AiPathCompleteModulePOST } from "@/app/api/mobile/v1/ai/path/complete-module/route";
import { POST as AiPathIncompleteModulePOST } from "@/app/api/mobile/v1/ai/path/incomplete-module/route";
import { POST as AiPathUnenrollPOST } from "@/app/api/mobile/v1/ai/path/unenroll/route";
import { GET as AiSkillsGET } from "@/app/api/mobile/v1/ai/skills/route";

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

describe("mobile ai routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("config GET: returns config when authenticated", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      aiSkillId: "sk1",
      preferredLanguage: "ar",
    });
    const res = await AiConfigGET(
      getRequest("http://localhost/api/mobile/v1/ai/config?locale=ar"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ aiSkillId: "sk1", preferredLanguage: "ar" });
  });

  it("config GET: 401 when no bearer", async () => {
    const res = await AiConfigGET(
      getRequest("http://localhost/api/mobile/v1/ai/config", ""),
    );
    expect(res.status).toBe(401);
  });

  it("config POST: upserts config", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({ ok: true });
    const res = await AiConfigPOST(
      postRequest("http://localhost/api/mobile/v1/ai/config", {
        aiSkillId: "sk1",
        preferredLanguage: "en",
        systemPrompt: "s",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("path active GET: returns active path", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({
      _id: "lp1",
      status: "active",
    });
    const res = await AiPathActiveGET(
      getRequest("http://localhost/api/mobile/v1/ai/path/active"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ _id: "lp1", status: "active" });
  });

  it("path by skill GET: returns path", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({ _id: "lp2" });
    const res = await AiPathBySkillGET(
      getRequest("http://localhost/api/mobile/v1/ai/path?aiSkillId=sk1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ _id: "lp2" });
  });

  it("complete-module POST: uses learningPathId directly", async () => {
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({
      status: "active",
      completedModuleIds: ["m1"],
    });
    const res = await AiPathCompleteModulePOST(
      postRequest("http://localhost/api/mobile/v1/ai/path/complete-module", {
        learningPathId: "lp1",
        moduleId: "m1",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("complete-module POST: resolves path via aiSkillId", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({ _id: "lp2" });
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({
      status: "active",
      completedModuleIds: ["m1"],
    });
    const res = await AiPathCompleteModulePOST(
      postRequest("http://localhost/api/mobile/v1/ai/path/complete-module", {
        aiSkillId: "sk1",
        moduleId: "m1",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("incomplete-module POST: resolves and calls mutation", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({ _id: "lp3" });
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({
      status: "active",
      completedModuleIds: [],
    });
    const res = await AiPathIncompleteModulePOST(
      postRequest("http://localhost/api/mobile/v1/ai/path/incomplete-module", {
        aiSkillId: "sk1",
        moduleId: "m1",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("unenroll POST: resolves and calls mutation", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce({ _id: "lp4" });
    (fetchMutation as unknown as Mock).mockResolvedValueOnce({
      status: "archived",
    });
    const res = await AiPathUnenrollPOST(
      postRequest("http://localhost/api/mobile/v1/ai/path/unenroll", {
        aiSkillId: "sk1",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "archived" });
  });

  it("skills GET: returns items list", async () => {
    (fetchQuery as unknown as Mock).mockResolvedValueOnce([
      { _id: "sk1", nameEn: "A" },
    ]);
    const res = await AiSkillsGET(
      getRequest("http://localhost/api/mobile/v1/ai/skills"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ items: [{ _id: "sk1", nameEn: "A" }] });
  });
});
