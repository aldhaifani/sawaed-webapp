"use client";

import { IntlErrorCode, NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

export interface IntlClientProviderProps {
  readonly locale: string;
  readonly messages: Record<string, unknown>;
  readonly children: ReactNode;
}

function onError(error: unknown): void {
  const err = error as { code?: string } & Error;
  if (err?.code === IntlErrorCode.MISSING_MESSAGE) {
    // Expected occasionally in non-default locales; log at warn level
    console.warn(err);
    return;
  }
  Sentry.captureException(err);
}

function getMessageFallback({
  namespace,
  key,
  error,
}: {
  namespace?: string;
  key: string;
  error: { code?: string } & Error;
}): string {
  const path = [namespace, key].filter(Boolean).join(".");
  if (error?.code === IntlErrorCode.MISSING_MESSAGE) {
    return `${path}`; // show key path as a safe fallback
  }
  return `__${path}__`;
}

export function IntlClientProvider({
  locale,
  messages,
  children,
}: IntlClientProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={onError}
      getMessageFallback={getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
