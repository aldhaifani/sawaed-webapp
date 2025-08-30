import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "../_store";
import { cleanupStaleSessions } from "../_store";
import { checkRateLimit, getClientIp } from "../_rateLimit";

export type StatusResponse = {
  readonly sessionId: string;
  readonly status: "queued" | "running" | "partial" | "done" | "error";
  readonly text: string;
  readonly updatedAt: number;
  readonly error?: string;
};

export async function GET(req: Request): Promise<NextResponse<StatusResponse>> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/chat/status" },
    async () => {
      // Light per-IP limiter tailored for polling: up to 180 requests per 60s
      const ipKey = getClientIp(req);
      const rl = checkRateLimit(`${ipKey}:status`, 180, 60_000);
      if (!rl.allowed) {
        Sentry.captureMessage("chat_status_rate_limited", { level: "warning" });
        return NextResponse.json(
          {
            sessionId: "",
            status: "error",
            text: "",
            updatedAt: Date.now(),
            error: "rate_limited",
          },
          { status: 429 },
        );
      }

      // Best-effort GC
      cleanupStaleSessions(5 * 60_000, 200);

      const { searchParams } = new URL(req.url);
      const sessionId = searchParams.get("sessionId") ?? "";
      if (!sessionId) {
        return NextResponse.json(
          {
            sessionId: "",
            status: "error",
            text: "",
            updatedAt: Date.now(),
            error: "missing_sessionId",
          },
          { status: 400 },
        );
      }
      const s = getSession(sessionId);
      if (!s) {
        return NextResponse.json(
          {
            sessionId,
            status: "error",
            text: "",
            updatedAt: Date.now(),
            error: "session_not_found",
          },
          { status: 404 },
        );
      }
      // ETag using updatedAt (weak)
      const etag = `W/"${s.updatedAt}"`;
      const inm = req.headers.get("if-none-match");
      if (inm && inm === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            "Cache-Control": "no-store",
            ETag: etag,
          },
        });
      }
      return NextResponse.json(
        {
          sessionId: s.sessionId,
          status: s.status,
          text: s.text,
          updatedAt: s.updatedAt,
          error: s.error,
        },
        {
          headers: {
            "Cache-Control": "no-store",
            ETag: etag,
          },
        },
      );
    },
  );
}
