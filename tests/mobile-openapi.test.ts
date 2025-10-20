import { describe, it, expect } from "vitest";
import { GET as OpenApiGET } from "@/app/api/mobile/openapi.json/route";

function getRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

describe("mobile openapi.json contents", () => {
  it("includes onboarding and profile paths", async () => {
    const res = await OpenApiGET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const paths = (json as any).paths ?? {};
    expect(paths["/api/mobile/v1/onboarding/status"]).toBeTruthy();
    expect(paths["/api/mobile/v1/onboarding/draft"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/me"]).toBeTruthy();
    // auth
    expect(paths["/api/mobile/auth/signout"]).toBeTruthy();
    // locations
    expect(paths["/api/mobile/v1/locations/regions"]).toBeTruthy();
    expect(paths["/api/mobile/v1/locations/cities"]).toBeTruthy();
    // profile edits
    expect(paths["/api/mobile/v1/profile/basics"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/phone"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/gender"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/picture/upload-url"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/picture/complete"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/education"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/education/{id}"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/experience"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/experience/{id}"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/projects"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/projects/{id}"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/awards"]).toBeTruthy();
    expect(paths["/api/mobile/v1/profile/awards/{id}"]).toBeTruthy();
    // ai
    expect(paths["/api/mobile/v1/ai/config"]).toBeTruthy();
    expect(paths["/api/mobile/v1/ai/skills"]).toBeTruthy();
    expect(paths["/api/mobile/v1/ai/path"]).toBeTruthy();
    expect(paths["/api/mobile/v1/ai/path/active"]).toBeTruthy();
    expect(paths["/api/mobile/v1/ai/path/complete-module"]).toBeTruthy();
    expect(paths["/api/mobile/v1/ai/path/incomplete-module"]).toBeTruthy();
    expect(paths["/api/mobile/v1/ai/path/unenroll"]).toBeTruthy();
    // events
    expect(paths["/api/mobile/v1/events"]).toBeTruthy();
    expect(paths["/api/mobile/v1/events/{id}"]).toBeTruthy();
    expect(paths["/api/mobile/v1/events/{id}/register"]).toBeTruthy();
    expect(paths["/api/mobile/v1/events/{id}/cancel"]).toBeTruthy();
  });
});
