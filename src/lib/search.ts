/**
 * Bilingual search utilities: Arabic diacritics-insensitive and case-insensitive matching.
 */

export type Locale = "ar" | "en";

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g; // Harakat & Quranic marks
const TATWEEL = /\u0640/g; // ـ

function normalizeArabic(text: string): string {
  // Normalize common variants to improve matching
  return (
    text
      .replace(ARABIC_DIACRITICS, "")
      .replace(TATWEEL, "")
      // Normalize Alef variants
      .replace(/[\u0622\u0623\u0625]/g, "\u0627")
      // Normalize Ya and Alef Maqsura
      .replace(/[\u0649\u064A]/g, "\u064A")
      // Normalize Ta Marbuta to Ha-like for matching
      .replace(/\u0629/g, "\u0647")
  );
}

export function normalizeText(text: string, locale: Locale): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (locale === "ar") return normalizeArabic(trimmed);
  return trimmed.toLowerCase();
}

export function includesQuery(
  value: string,
  query: string,
  locale: Locale,
): boolean {
  const v = normalizeText(value, locale);
  const q = normalizeText(query, locale);
  if (!q) return true;
  return v.toLowerCase().includes(q.toLowerCase());
}
