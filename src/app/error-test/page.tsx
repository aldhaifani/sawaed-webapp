"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback } from "react";
import type { ReactElement } from "react";

/**
 * ErrorTestPage renders buttons to trigger unhandled and handled errors
 * to verify Sentry capture and PII scrubbing configuration.
 */
export default function Page(): ReactElement {
  const throwUnhandled = useCallback((): void => {
    // Unhandled error (will be auto-captured by Sentry)
    throw new Error("Test unhandled error from /error-test");
  }, []);

  const sendHandled = useCallback(async (): Promise<void> => {
    // Handled error (explicitly captured)
    const err = new Error("Test handled error from /error-test");
    Sentry.startSpan(
      { op: "ui.click", name: "ErrorTest: handled error" },
      (span) => {
        span.setAttribute("page", "/error-test");
        span.setAttribute("kind", "handled");
        Sentry.captureException(err, {
          tags: { area: "error-test" },
          extra: { note: "This is a test handled exception" },
        });
      },
    );
  }, []);

  const triggerServerError = useCallback(async (): Promise<void> => {
    try {
      await fetch("/api/error-test");
    } catch {
      // Intentionally ignore; the API throws to test server-side capture
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-xl flex-col items-center gap-4 rounded-lg border border-gray-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Sentry Error Test</h1>
        <p className="text-center text-sm text-gray-600">
          Use these buttons to verify that errors are reported to Sentry and
          that sensitive data is redacted.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={throwUnhandled}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Throw unhandled error
          </button>
          <button
            type="button"
            onClick={sendHandled}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Send handled error
          </button>
          <button
            type="button"
            onClick={triggerServerError}
            className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
          >
            Trigger server error
          </button>
        </div>
      </div>
    </main>
  );
}
