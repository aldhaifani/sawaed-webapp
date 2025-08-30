import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  appendPartial,
  createSession,
  setDone,
  setError,
  setRunning,
} from "../_store";
import { cleanupStaleSessions } from "../_store";
import { checkRateLimit, getClientIp } from "../_rateLimit";

export type SendRequest = {
  readonly skillId: string;
  readonly message: string;
};

export type SendResponse = {
  readonly sessionId: string;
};

function simulateAiGeneration(sessionId: string, locale: "ar" | "en"): void {
  try {
    setRunning(sessionId);
    const chunks: readonly string[] =
      locale === "ar"
        ? [
            "## مثال ماركداون\n\n",
            "- عنصر أول\n",
            "- عنصر ثانٍ\n\n",
            "```ts\nfunction greet(name: string): string {\n  return `مرحبا، ${name}`;\n}\n```\n\n",
            "> تذكير: هذا رد تجريبي للتأكد من دعم الـ Markdown.",
          ]
        : [
            "## Markdown Example\n\n",
            "- First item\n",
            "- Second item\n\n",
            "```ts\nfunction greet(name: string): string {\n  return `Hello, ${name}`;\n}\n```\n\n",
            "> Note: This is a dummy reply to verify Markdown rendering.",
          ];

    let delay = 250;
    chunks.forEach((c, i) => {
      setTimeout(() => {
        appendPartial(sessionId, c);
        if (i === chunks.length - 1) setDone(sessionId);
      }, delay);
      delay += 250;
    });
  } catch (err) {
    setError(sessionId, err instanceof Error ? err.message : "unknown_error");
    Sentry.captureException(err);
  }
}

export async function POST(req: Request): Promise<NextResponse<SendResponse>> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/chat/send" },
    async () => {
      // Basic per-IP rate limit: 10 requests per 10 seconds
      const ipKey = getClientIp(req);
      const rl = checkRateLimit(`${ipKey}:send`, 10, 10_000);
      if (!rl.allowed) {
        Sentry.captureMessage("chat_send_rate_limited", { level: "warning" });
        return NextResponse.json({ sessionId: "" } as SendResponse, {
          status: 429,
        });
      }

      // Best-effort stale session cleanup (5 minutes max age, keep up to 200 entries)
      cleanupStaleSessions(5 * 60_000, 200);

      const localeHeader = req.headers.get("x-locale");
      const locale: "ar" | "en" = localeHeader === "ar" ? "ar" : "en";

      const body = (await req.json()) as Partial<SendRequest>;
      if (
        !body ||
        typeof body.skillId !== "string" ||
        typeof body.message !== "string"
      ) {
        return NextResponse.json({ sessionId: "" } as SendResponse, {
          status: 400,
        });
      }

      const session = createSession();
      simulateAiGeneration(session.sessionId, locale);
      return NextResponse.json({ sessionId: session.sessionId });
    },
  );
}
