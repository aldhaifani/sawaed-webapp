"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) {
      if (process.env.NODE_ENV === "development") {
        // Avoid noisy errors in dev when no key is configured
        console.warn("PostHog disabled: NEXT_PUBLIC_POSTHOG_KEY not set");
      }
      return;
    }
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest";
    posthog.init(key, {
      api_host: host,
      ui_host: "https://eu.posthog.com",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
