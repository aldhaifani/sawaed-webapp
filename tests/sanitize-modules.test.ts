import { describe, it, expect } from "vitest";
import {
  sanitizeModules,
  isLikelyPublicHttpUrl,
} from "@/shared/ai/sanitize-modules";
import type { ModuleItemParsed } from "@/shared/ai/module-item.schema";

function baseModule(
  overrides: Partial<ModuleItemParsed> = {},
): ModuleItemParsed {
  const base: ModuleItemParsed = {
    id: "m1",
    title: "Intro to Topic",
    type: "article",
    duration: "10 min",
  } as ModuleItemParsed;
  return { ...base, ...(overrides as ModuleItemParsed) };
}

describe("isLikelyPublicHttpUrl", () => {
  it("accepts https public domains", () => {
    expect(isLikelyPublicHttpUrl("https://example.com/path")).toBe(true);
  });
  it("rejects localhost and IPs", () => {
    expect(isLikelyPublicHttpUrl("http://localhost:3000")).toBe(false);
    expect(isLikelyPublicHttpUrl("http://127.0.0.1:8080")).toBe(false);
  });
  it("rejects non-http protocols and bare hosts", () => {
    expect(isLikelyPublicHttpUrl("ftp://example.com"));
    expect(isLikelyPublicHttpUrl("https://intranet"));
  });
});

describe("sanitizeModules", () => {
  it("keeps valid URL and clamps keywords to 10", () => {
    const input = [
      baseModule({
        id: "a",
        resourceUrl: "https://example.com/resource",
        searchKeywords: Array.from({ length: 20 }, (_, i) => `k${i}`),
      }),
    ];
    const out = sanitizeModules(input);
    expect(out[0]!.resourceUrl).toBe("https://example.com/resource");
    expect((out[0]!.searchKeywords ?? []).length).toBe(10);
  });

  it("drops invalid URL and ensures 3-8 keywords when keywords present but too few", () => {
    const input = [
      baseModule({
        id: "b",
        resourceUrl: "http://localhost:3000",
        searchKeywords: ["k1", "k2"],
      }),
    ];
    const out = sanitizeModules(input);
    expect(out[0]!.resourceUrl).toBeUndefined();
    expect((out[0]!.searchKeywords ?? []).length).toBeGreaterThanOrEqual(3);
    expect((out[0]!.searchKeywords ?? []).length).toBeLessThanOrEqual(8);
  });

  it("adds fallback keywords when none provided and no URL", () => {
    const input = [baseModule({ id: "c" })];
    const out = sanitizeModules(input);
    expect(out[0]!.resourceUrl).toBeUndefined();
    expect(
      out[0]!.searchKeywords && out[0]!.searchKeywords!.length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("drops valid URL not in allowlist and enforces keywords; keeps URL when in allowlist", () => {
    const url1 = "https://example.com/a";
    const url2 = "https://example.org/b";
    // Not in allowlist
    const out1 = sanitizeModules(
      [baseModule({ id: "d", resourceUrl: url1, searchKeywords: ["k1"] })],
      [url2],
    );
    expect(out1[0]!.resourceUrl).toBeUndefined();
    expect((out1[0]!.searchKeywords ?? []).length).toBeGreaterThanOrEqual(3);

    // In allowlist
    const out2 = sanitizeModules(
      [
        baseModule({
          id: "e",
          resourceUrl: url2,
          searchKeywords: [
            "k1",
            "k2",
            "k3",
            "k4",
            "k5",
            "k6",
            "k7",
            "k8",
            "k9",
            "k10",
            "k11",
          ],
        }),
      ],
      [url2],
    );
    expect(out2[0]!.resourceUrl).toBe(url2);
    expect((out2[0]!.searchKeywords ?? []).length).toBe(10);
  });
});
