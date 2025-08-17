"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type Language = "en" | "ar";

/**
 * LanguageSwitcher
 * Minimal client-only language switcher using a cookie-based locale.
 * Does not alter routing; it sets `locale` cookie and reloads the page.
 */
export function LanguageSwitcher() {
  const [locale, setLocale] = useState<Language>("ar");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const match = /(?:^|; )locale=([^;]+)/.exec(document.cookie);
    const raw = match?.[1] ?? undefined;
    const fromCookie = raw ? decodeURIComponent(raw) : undefined;
    if (fromCookie === "en" || fromCookie === "ar") setLocale(fromCookie);
  }, []);

  const setPreference = useMutation(api.preferences.setLanguagePreference);

  const switchLocale = async (next: Language) => {
    if (next === locale) return;
    const days = 365;
    const expires = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000,
    ).toUTCString();
    document.cookie = `locale=${encodeURIComponent(next)}; expires=${expires}; path=/; samesite=lax`;
    try {
      await setPreference({ locale: next });
    } catch {
      // ignore persistence errors; cookie already applied
    }
    const current = pathname || window.location.pathname;
    const parts = current.split("/");
    // parts like ["", "en", "a", ...] or ["", "auth"]
    const first = parts[1];
    if (first === "en" || first === "ar") {
      parts[1] = next;
    } else {
      // no locale prefix, add one
      parts.splice(1, 0, next);
    }
    const target = parts.join("/") || `/${next}`;
    router.push(target);
    router.refresh();
    setLocale(next);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex rounded-md border">
        <ToggleGroup
          type="single"
          value={locale}
          onValueChange={(val) => {
            if (!val) return;
            void switchLocale(val as Language);
          }}
        >
          <ToggleGroupItem
            value="en"
            aria-label="Toggle en"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
          >
            English
          </ToggleGroupItem>
          <ToggleGroupItem
            value="ar"
            aria-label="Toggle ar"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
          >
            العربية
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
