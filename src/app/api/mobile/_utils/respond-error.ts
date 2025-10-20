import { NextResponse } from "next/server";

export type ErrorEnvelope = {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
};

/**
 * Create a standardized JSON error response.
 */
export function respondError(
  code: string,
  message: string,
  httpStatus: number,
): NextResponse<ErrorEnvelope> {
  return new NextResponse<ErrorEnvelope>(
    JSON.stringify({ error: { code, message } }),
    {
      status: httpStatus,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}
