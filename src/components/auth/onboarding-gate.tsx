"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

/**
 * Client-side gate to enforce youth onboarding across all youth pages.
 * Skips redirect when already on the onboarding page.
 */
export function OnboardingGate(): null {
  const locale = (useLocale() as "ar" | "en") ?? "ar";
  const pathname = usePathname();
  const router = useRouter();
  const status = useQuery(api.onboarding.getStatus, {});

  useEffect(() => {
    if (!status) return; // loading
    if (pathname?.includes("/onboarding")) return;
    if (!status.completed) {
      router.replace(`/${locale}/onboarding`);
    }
  }, [status, router, locale, pathname]);

  return null;
}
