export function isIdCandidate(id: string | undefined | null): boolean {
  if (typeof id !== "string") return false;
  const s = id.trim();
  if (s.length < 8) return false;
  // Allow alphanumerics, underscore, hyphen only
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return false;
  return true;
}
