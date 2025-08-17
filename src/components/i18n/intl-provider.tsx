import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import type { AppLocale } from "./get-locale";

async function loadMessages(
  locale: AppLocale,
): Promise<Record<string, unknown>> {
  const mod = (await import(`@/i18n/messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };
  return mod.default;
}

export interface IntlProviderProps {
  readonly locale: AppLocale;
  readonly children: ReactNode;
}

/**
 * Server component provider that loads locale messages and wraps children.
 * Keep usage minimal in role layouts, after RBAC checks.
 */
export async function IntlProvider({ locale, children }: IntlProviderProps) {
  const messages = await loadMessages(locale);
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
