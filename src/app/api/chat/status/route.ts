import * as Sentry from "@sentry/nextjs";
import { getSession } from "../_store";
import { cleanupStaleSessions } from "../_store";
import { setError } from "../_store";
import { checkRateLimit, getClientIp } from "../_rateLimit";

export type StatusResponse = {
  readonly sessionId: string;
  readonly status: "queued" | "running" | "partial" | "done" | "error";
  readonly text: string;
  readonly updatedAt: number;
  readonly error?: string;
};

export async function GET(req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "GET /api/chat/status" },
    async () => {
      try {
        // Light per-IP limiter tailored for polling: up to 180 requests per 60s
        const ipKey = getClientIp(req);
        const rl = checkRateLimit(`${ipKey}:status`, 180, 60_000);
        if (!rl.allowed) {
          Sentry.captureMessage("chat_status_rate_limited", {
            level: "warning",
          });
          return new Response(
            JSON.stringify({
              sessionId: "",
              status: "error",
              text: "",
              updatedAt: Date.now(),
              error: "rate_limited",
            } satisfies StatusResponse),
            { status: 429, headers: { "content-type": "application/json" } },
          );
        }

        // Best-effort GC
        cleanupStaleSessions(5 * 60_000, 200);

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId") ?? "";
        if (!sessionId) {
          return new Response(
            JSON.stringify({
              sessionId: "",
              status: "error",
              text: "",
              updatedAt: Date.now(),
              error: "missing_sessionId",
            } satisfies StatusResponse),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
        const s = getSession(sessionId);
        if (!s) {
          return new Response(
            JSON.stringify({
              sessionId,
              status: "error",
              text: "",
              updatedAt: Date.now(),
              error: "session_not_found",
            } satisfies StatusResponse),
            { status: 404, headers: { "content-type": "application/json" } },
          );
        }
        // Auto-timeout long-running sessions to avoid indefinite spinners
        try {
          const MAX_RUNNING_AGE_MS = 3 * 60_000; // 3 minutes
          if (
            (s.status === "running" || s.status === "partial") &&
            Date.now() - s.updatedAt > MAX_RUNNING_AGE_MS
          ) {
            setError(sessionId, "timeout");
          }
        } catch {}

        // Calculate ETag for caching
        const responseData = {
          sessionId: s.sessionId,
          status: s.status,
          text: s.text,
          updatedAt: s.updatedAt,
          error: s.error,
        } satisfies StatusResponse;

        const etag = `"${s.updatedAt}-${s.text.length}"`;
        const ifNoneMatch = req.headers.get("if-none-match");

        // Return 304 if content hasn't changed
        if (
          ifNoneMatch === etag &&
          s.status !== "done" &&
          s.status !== "error"
        ) {
          return new Response(null, {
            status: 304,
            headers: {
              etag: etag,
              "cache-control": "no-cache",
            },
          });
        }

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: {
            "content-type": "application/json",
            etag: etag,
            "cache-control": "no-cache",
          },
        });
      } catch (err) {
        Sentry.captureException(err);
        return new Response(
          JSON.stringify({
            sessionId: "",
            status: "error",
            text: "",
            updatedAt: Date.now(),
            error: "status_unexpected_error",
          } satisfies StatusResponse),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
    },
  );
}
