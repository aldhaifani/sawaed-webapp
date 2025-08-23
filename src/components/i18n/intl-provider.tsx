import { IntlClientProvider } from "./intl-client-provider";
import type { ReactNode } from "react";
import type { AppLocale } from "./get-locale";

async function loadMessages(
  locale: AppLocale,
): Promise<Record<string, unknown>> {
  // Load target locale messages and fall back to English for any missing keys
  const modules = await Promise.all([
    import(`@/i18n/messages/${locale}.json`),
    import("@/i18n/messages/en.json"),
  ]);
  const targetMod = modules[0] as { default: Record<string, unknown> };
  const englishMod = modules[1] as { default: Record<string, unknown> };
  const target = targetMod.default;
  const english = englishMod.default;
  return deepMerge(english, target);
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
    <IntlClientProvider locale={locale} messages={messages}>
      {children}
    </IntlClientProvider>
  );
}

// Shallowly copy and recursively merge objects so locale overrides default EN,
// while missing keys fall back to EN. Arrays are replaced by target values.
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseVal = result[key];
    if (isPlainObject(baseVal) && isPlainObject(value)) {
      result[key] = deepMerge(baseVal, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v != null && !Array.isArray(v);
}
