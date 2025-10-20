import type { NextRequest } from "next/server";

export function getBearerToken(req: Request | NextRequest): string | null {
  const authHeader: string | null = req.headers.get("authorization");
  if (!authHeader) return null;
  const parts: string[] = authHeader.split(" ");
  if (parts.length !== 2) return null;
  const scheme: string | undefined = parts[0];
  const token: string | undefined = parts[1];
  if (!scheme || scheme.toLowerCase() !== "bearer") return null;
  return token ?? null;
}
