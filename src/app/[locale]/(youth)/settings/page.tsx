"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  Mail,
  Globe,
  Moon,
  Sun,
  Bell,
  Shield,
  Trash2,
  Laptop,
  User2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import BasicDropdown from "@/components/ui/BasicDropdown";

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
  const [email, setEmail] = useState<string>("ahmed.alharthy@example.com");
  const [language, setLanguage] = useState<string>("en");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [marketing, setMarketing] = useState<boolean>(true);
  const [product, setProduct] = useState<boolean>(true);
  const [security, setSecurity] = useState<boolean>(true);
  // Removed unused profilePublic and searchable states

  // Removed unused sessions memoized data

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <header className="mb-5 sm:mb-6">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your account, preferences, and security.
          </p>
        </header>

        <div className="space-y-6">
          {/* Preferences Card: language & theme */}
          <SectionCard
            title="Preferences"
            description="Choose language and appearance."
          >
            <ul className="divide-y">
              <Row
                icon={<Globe className="size-4" />}
                title="Language"
                subtitle="Used across the app UI."
                right={
                  <div className="w-48">
                    <BasicDropdown
                      className="w-full"
                      label={language === "en" ? "English" : "Arabic"}
                      items={[
                        {
                          id: "en",
                          label: "English",
                          icon: <Globe className="size-4" />,
                        },
                        {
                          id: "ar",
                          label: "Arabic",
                          icon: <Globe className="size-4" />,
                        },
                      ]}
                      onChange={(i) => setLanguage(String(i.id))}
                    />
                  </div>
                }
              />
              <Row
                icon={<Moon className="size-4" />}
                title="Theme"
                subtitle="Switch between system, light, and dark."
                right={
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "system" ? "secondary" : "outline"}
                      onClick={() => setTheme("system")}
                      className="gap-2"
                    >
                      <Laptop className="size-4" /> System
                    </Button>
                    <Button
                      variant={theme === "light" ? "secondary" : "outline"}
                      onClick={() => setTheme("light")}
                      className="gap-2"
                    >
                      <Sun className="size-4" /> Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "secondary" : "outline"}
                      onClick={() => setTheme("dark")}
                      className="gap-2"
                    >
                      <Moon className="size-4" /> Dark
                    </Button>
                  </div>
                }
              />
            </ul>
          </SectionCard>

          {/* Notifications Card: list rows with toggles */}
          <SectionCard
            title="Notifications"
            description="Manage what you want to be notified about."
            footer={
              <p className="text-muted-foreground text-xs">
                You can change these at any time.
              </p>
            }
          >
            <ul className="divide-y">
              <Row
                icon={<Bell className="size-4" />}
                title="Product updates"
                subtitle="Announcements about new features and improvements."
                right={
                  <Toggle
                    pressed={product}
                    onPressedChange={setProduct}
                    aria-label="Toggle product updates"
                  />
                }
              />
              <Row
                icon={<Shield className="size-4" />}
                title="Security alerts"
                subtitle="Logins and password changes."
                right={
                  <Toggle
                    pressed={security}
                    onPressedChange={setSecurity}
                    aria-label="Toggle security alerts"
                  />
                }
              />
              <Row
                icon={<Bell className="size-4" />}
                title="Opportunities & marketing"
                subtitle="Occasional emails with curated opportunities."
                right={
                  <Toggle
                    pressed={marketing}
                    onPressedChange={setMarketing}
                    aria-label="Toggle marketing"
                  />
                }
              />
            </ul>
          </SectionCard>
          {/* Accounts-like Card: Account settings */}
          <SectionCard
            title="Account"
            description="Manage basic account details and actions."
            footer={
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  className="inline-flex items-center gap-2 text-xs"
                >
                  <Trash2 className="size-4" /> Delete account
                </Button>
              </div>
            }
          >
            <ul className="divide-y">
              <Row
                icon={<User2 className="size-4" />}
                title="Email"
                subtitle="Change the email used for sign-in and notifications."
                right={
                  <div className="relative w-72 max-sm:w-40">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                }
              />
            </ul>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
