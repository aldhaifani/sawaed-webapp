import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { isCorsRequest } from "@/app/api/mobile/_utils/is-cors-request";

// Narrowed wrapper for fetchAction
const callAction = fetchAction as unknown as (
  name: "auth:signOut",
  args: unknown,
  options?: { readonly token?: string },
) => Promise<unknown>;

export async function POST(_req: Request): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/auth/signout" },
    async () => {
      try {
        if (isCorsRequest(_req)) {
          return new Response("Invalid origin", { status: 403 });
        }
        await callAction("auth:signOut", {});
        return NextResponse.json({ ok: true });
      } catch (err) {
        Sentry.captureException(err);
        // Best-effort: still respond ok to allow client to clear local state
        return NextResponse.json({ ok: true });
      }
    },
  );
}
