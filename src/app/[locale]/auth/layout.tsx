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
      <div className="relative min-h-screen w-full bg-white">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `\n        linear-gradient(to right, rgba(229,231,235,0.8) 1px, transparent 1px),\n        linear-gradient(to bottom, rgba(229,231,235,0.8) 1px, transparent 1px),\n        radial-gradient(circle 500px at 20% 100%, rgba(139,92,246,0.3), transparent),\n        radial-gradient(circle 500px at 100% 80%, rgba(59,130,246,0.3), transparent)\n      `,
            backgroundSize: "48px 48px, 48px 48px, 100% 100%, 100% 100%",
          }}
        />
        <div className="relative z-10">{children}</div>
      </div>
    </IntlProvider>
  );
}
