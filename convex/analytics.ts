"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export type CaptureParams = Readonly<{
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
}>;

export const captureEvent = action({
  args: {
    event: v.string(),
    distinctId: v.string(),
    properties: v.optional(v.any()),
  },
  handler: async (
    _ctx,
    { event, distinctId, properties }: CaptureParams,
  ): Promise<void> => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    const { PostHog } = await import("posthog-node");
    const client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
    try {
      client.capture({ event, distinctId, properties });
      await client.flush();
    } catch {
      // swallow analytics errors
    } finally {
      client.shutdown();
    }
  },
});
