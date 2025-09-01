import { type ModuleItemParsed } from "./module-item.schema";

/**
 * Validate that URL is http(s) and looks like a public host (no localhost/IPs, must have a dot TLD)
 */
export function isLikelyPublicHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false; // IPv4
    if (!host.includes(".")) return false; // must have a dot TLD
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize modules according to URL/keywords policy while preserving richer optional fields.
 * - Drop invalid resourceUrl
 * - If no valid URL, ensure 3-8 searchKeywords (fallback seeds if missing)
 * - Clamp searchKeywords length when present
 */
export function sanitizeModules(
  mods: ReadonlyArray<ModuleItemParsed>,
  allowedUrls?: ReadonlyArray<string>,
): ReadonlyArray<ModuleItemParsed> {
  const allowset = new Set((allowedUrls ?? []).map((u) => u.trim()));
  return mods.map((m) => {
    const out: ModuleItemParsed = { ...m };
    const rawUrl = typeof out.resourceUrl === "string" ? out.resourceUrl : null;
    const trimmedUrl = rawUrl ? rawUrl.trim() : "";
    const hasUrl = trimmedUrl.length > 0;
    if (hasUrl && !isLikelyPublicHttpUrl(trimmedUrl)) {
      delete out.resourceUrl;
    }
    const urlAfterClean =
      typeof out.resourceUrl === "string" ? out.resourceUrl : null;
    const hasValidUrl = !!(
      urlAfterClean && isLikelyPublicHttpUrl(urlAfterClean)
    );
    // If an allowlist is provided, the URL must be included
    let isAllowed = false;
    if (hasValidUrl && urlAfterClean) {
      isAllowed = allowset.size === 0 || allowset.has(urlAfterClean);
    }
    if (!hasValidUrl) {
      const arr = Array.isArray(out.searchKeywords)
        ? out.searchKeywords.filter(
            (s) => typeof s === "string" && s.trim().length > 0,
          )
        : [];
      const ensured =
        arr.length >= 3
          ? arr.slice(0, 8)
          : [out.title, out.type, "learning", "beginner"]
              .filter((v): v is string => typeof v === "string" && v.length > 0)
              .slice(0, 8);
      out.searchKeywords = ensured;
    } else if (!isAllowed) {
      // Drop URL not in allowlist and enforce keywords
      delete out.resourceUrl;
      const arr = Array.isArray(out.searchKeywords)
        ? out.searchKeywords.filter(
            (s) => typeof s === "string" && s.trim().length > 0,
          )
        : [];
      const ensured =
        arr.length >= 3
          ? arr.slice(0, 8)
          : [out.title, out.type, "learning", "beginner"]
              .filter((v): v is string => typeof v === "string" && v.length > 0)
              .slice(0, 8);
      out.searchKeywords = ensured;
    } else if (Array.isArray(out.searchKeywords)) {
      const cur = out.searchKeywords.filter(
        (s) => typeof s === "string" && s.trim().length > 0,
      );
      out.searchKeywords = cur.slice(0, 10);
    }
    return out;
  });
}
