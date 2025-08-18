import { type ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { IntlProvider } from "@/components/i18n/intl-provider";
import { Direction } from "@/components/i18n/direction";

interface AuthLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: "en" | "ar" }>;
}

export default async function AuthLayout(props: AuthLayoutProps) {
  const { children } = props;
  const { locale } = await props.params;
  setRequestLocale(locale);
  return (
    <IntlProvider locale={locale}>
      <Direction locale={locale} />
      {children}
    </IntlProvider>
  );
}
