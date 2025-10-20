import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { withConvexToken } from "@/app/api/mobile/_utils/with-convex-token";
import { respondError } from "@/app/api/mobile/_utils/respond-error";
import { parseJsonBody } from "@/app/api/mobile/_utils/parse-json-body";
import { rateLimitCheck } from "@/app/api/mobile/_utils/rate-limit";

const BodySchema = z.object({
  quantity: z.coerce.number().int().min(1).optional(),
  notes: z.string().max(500).optional(),
});

const callMutation = fetchMutation as unknown as (
  name: "eventRegistrations:applyToEvent",
  args: {
    readonly eventId: string;
    readonly quantity?: number;
    readonly notes?: string;
  },
  options?: { readonly token?: string },
) => Promise<unknown>;

function messageFor(code: string): string {
  switch (code) {
    case "EVENT_NOT_AVAILABLE":
      return "Event is not available for registration";
    case "REGISTRATION_NOT_OPEN":
      return "Registration has not opened yet";
    case "REGISTRATION_CLOSED":
      return "Registration is closed";
    case "EVENT_PAST":
      return "Event has already ended";
    case "INVITE_ONLY":
      return "Registration is by invitation only";
    case "ALREADY_REGISTERED":
      return "You already have an active registration";
    case "REJECTED_CANNOT_REAPPLY":
      return "You cannot re-apply after rejection";
    case "INVALID_QUANTITY":
      return "Invalid quantity";
    case "MAX_PER_USER_EXCEEDED":
      return "Exceeds per-user seat limit";
    case "EVENT_FULL":
      return "Event is full";
    default:
      return code;
  }
}

export async function POST(
  req: Request,
  ctx: { params: { id: string } },
): Promise<Response> {
  return Sentry.startSpan(
    { op: "http.route", name: "POST /api/mobile/v1/events/:id/register" },
    async () => {
      return withConvexToken(req, async ({ token }) => {
        if (!token)
          return respondError("unauthorized", "Missing bearer token", 401);
        const rl = rateLimitCheck({
          token,
          key: "mobile:events:register",
          limit: 5,
          windowMs: 10_000,
        });
        if (!rl.ok) return rl.response;
        try {
          const { id } = ctx.params;
          const body = await parseJsonBody(req, BodySchema);
          const result = await callMutation(
            "eventRegistrations:applyToEvent",
            { eventId: id, quantity: body.quantity, notes: body.notes },
            { token },
          );
          return NextResponse.json(result);
        } catch (err: unknown) {
          Sentry.captureException(err);
          const code =
            err instanceof Error && typeof err.message === "string"
              ? err.message
              : "apply_failed";
          // Map known domain errors to 409; otherwise 400
          const conflictCodes = new Set([
            "EVENT_NOT_AVAILABLE",
            "EVENT_NOT_AVAILABLE",
            "REGISTRATION_NOT_OPEN",
            "REGISTRATION_CLOSED",
            "EVENT_PAST",
            "INVITE_ONLY",
            "ALREADY_REGISTERED",
            "REJECTED_CANNOT_REAPPLY",
            "INVALID_QUANTITY",
            "MAX_PER_USER_EXCEEDED",
            "EVENT_FULL",
          ]);
          const status = conflictCodes.has(code) ? 409 : 400;
          return respondError(code.toLowerCase(), messageFor(code), status);
        }
      });
    },
  );
}
