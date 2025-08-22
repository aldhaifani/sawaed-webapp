"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Mail, Globe, Bell, Shield, Trash2, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import BasicDropdown from "@/components/ui/BasicDropdown";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SectionCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): ReactElement {
  return (
    <section className="bg-card rounded-xl border shadow-sm">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <div>
          <h3 className="text-foreground text-base font-semibold">{title}</h3>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      <div className="p-0">{children}</div>
      {footer ? <div className="border-t p-4 sm:p-6">{footer}</div> : null}
    </section>
  );
}

function Row({
  icon,
  title,
  subtitle,
  right,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}): ReactElement {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <div className="bg-muted text-muted-foreground grid size-8 place-items-center rounded-full">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-medium">
            {title}
          </p>
          {subtitle ? (
            <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </li>
  );
}

export default function SettingsPage(): ReactElement {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch current email (for display only) and notifications
  const profileData = useQuery(api.profiles.getMyProfileComposite, {
    locale: locale === "en" ? "en" : "ar",
  });
  const notif = useQuery(api.notifications.getMyNotificationPreferences, {});

  // Local state
  const [, setEmail] = useState<string>("");
  const [, setTheme] = useState<"system" | "light" | "dark">("system");
  const [marketing, setMarketing] = useState<boolean>(false);
  const [product, setProduct] = useState<boolean>(true);
  const [security, setSecurity] = useState<boolean>(true);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  // Initialize from queries
  useEffect(() => {
    const userEmail = profileData?.user?.email;
    if (userEmail) setEmail(userEmail);
  }, [profileData]);
  useEffect(() => {
    if (notif) {
      setProduct(!!notif.productUpdates);
      setSecurity(!!notif.securityAlerts);
      setMarketing(!!notif.marketing);
    }
  }, [notif]);

  const applyTheme = useCallback((mode: "system" | "light" | "dark") => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const isDark = mode === "dark" || (mode === "system" && prefersDark);
    root.classList.toggle("dark", isDark);
  }, []);

  // Theme: load & persist
  useEffect(() => {
    const saved =
      (localStorage.getItem("theme") as "system" | "light" | "dark" | null) ??
      "system";
    setTheme(saved);
    applyTheme(saved);
  }, [applyTheme]);

  // Language switching
  const setPreference = useMutation(api.preferences.setLanguagePreference);
  const switchLocale = useCallback(
    async (next: "en" | "ar") => {
      const days = 365;
      const expires = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000,
      ).toUTCString();
      document.cookie = `locale=${encodeURIComponent(next)}; expires=${expires}; path=/; samesite=lax`;
      try {
        await setPreference({ locale: next });
      } catch {}
      const current = pathname || window.location.pathname;
      const parts = current.split("/");
      const first = parts[1];
      if (first === "en" || first === "ar") parts[1] = next;
      else parts.splice(1, 0, next);
      const target = parts.join("/") || `/${next}`;
      router.push(target);
      router.refresh();
    },
    [pathname, router, setPreference],
  );

  // Notifications persistence
  const saveNotif = useMutation(api.notifications.setMyNotificationPreferences);
  const updateNotif = useCallback(
    async (next: {
      productUpdates: boolean;
      securityAlerts: boolean;
      marketing: boolean;
    }) => {
      try {
        await saveNotif(next);
      } catch (e) {
        console.error(e);
      }
    },
    [saveNotif],
  );

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <header className="mb-5 sm:mb-6">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </header>

        <div className="space-y-6">
          {/* Preferences Card: language & theme */}
          <SectionCard
            title={t("sections.preferences.title")}
            description={t("sections.preferences.description")}
          >
            <ul className="divide-y">
              <Row
                icon={<Globe className="size-4" />}
                title={t("sections.preferences.language.label")}
                subtitle={t("sections.preferences.language.subtitle")}
                right={
                  <div className="w-28">
                    <BasicDropdown
                      className="w-full"
                      label={locale === "en" ? "English" : "العربية"}
                      items={[
                        {
                          id: "en",
                          label: "English",
                          icon: <Globe className="size-4" />,
                        },
                        {
                          id: "ar",
                          label: "العربية",
                          icon: <Globe className="size-4" />,
                        },
                      ]}
                      onChange={(i) =>
                        void switchLocale(String(i.id) as "en" | "ar")
                      }
                    />
                  </div>
                }
              />
            </ul>
          </SectionCard>

          {/* Notifications Card: list rows with toggles */}
          <SectionCard
            title={t("sections.notifications.title")}
            description={t("sections.notifications.description")}
            footer={
              <p className="text-muted-foreground text-xs">
                {t("sections.notifications.footer")}
              </p>
            }
          >
            <ul className="divide-y">
              <Row
                icon={<Bell className="size-4" />}
                title={t("sections.notifications.product.title")}
                subtitle={t("sections.notifications.product.subtitle")}
                right={
                  <Switch
                    checked={product}
                    onCheckedChange={(v) => {
                      setProduct(v);
                      void updateNotif({
                        productUpdates: v,
                        securityAlerts: security,
                        marketing,
                      });
                    }}
                    aria-label="Toggle product updates"
                  />
                }
              />
              <Row
                icon={<Shield className="size-4" />}
                title={t("sections.notifications.security.title")}
                subtitle={t("sections.notifications.security.subtitle")}
                right={
                  <Switch
                    checked={security}
                    onCheckedChange={(v) => {
                      setSecurity(v);
                      void updateNotif({
                        productUpdates: product,
                        securityAlerts: v,
                        marketing,
                      });
                    }}
                    aria-label="Toggle security alerts"
                  />
                }
              />
              <Row
                icon={<Bell className="size-4" />}
                title={t("sections.notifications.marketing.title")}
                subtitle={t("sections.notifications.marketing.subtitle")}
                right={
                  <Switch
                    checked={marketing}
                    onCheckedChange={(v) => {
                      setMarketing(v);
                      void updateNotif({
                        productUpdates: product,
                        securityAlerts: security,
                        marketing: v,
                      });
                    }}
                    aria-label="Toggle marketing"
                  />
                }
              />
            </ul>
          </SectionCard>
          {/* Accounts-like Card: Account settings */}
          <SectionCard
            title={t("sections.account.title")}
            description={t("sections.account.description")}
            footer={
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  className="inline-flex items-center gap-2 text-xs"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="size-4" />{" "}
                  {t("sections.account.delete.button")}
                </Button>
              </div>
            }
          >
            <ul className="divide-y">
              <Row
                icon={<User2 className="size-4" />}
                title={t("sections.account.email.label")}
                subtitle={t("sections.account.email.subtitle")}
                right={
                  <Button variant="outline" className="gap-2 text-xs" disabled>
                    <Mail className="size-4" />{" "}
                    {t("sections.account.email.action")}
                  </Button>
                }
              />
            </ul>
          </SectionCard>
        </div>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sections.account.delete.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("sections.account.delete.confirmMessage")}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="secondary">
                {t("sections.account.delete.cancel")}
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive">
                {t("sections.account.delete.confirm")}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
