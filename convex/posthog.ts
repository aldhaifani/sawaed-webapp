"use node";
import { PostHog } from "posthog-node";

export type CaptureParams = Readonly<{
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
}>;

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (client) return client;
  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export async function captureServerEvent({
  event,
  distinctId,
  properties,
}: CaptureParams): Promise<void> {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({ event, distinctId, properties });
    await ph.flush();
  } catch {
    // Swallow analytics errors to avoid impacting business logic
  }
}
