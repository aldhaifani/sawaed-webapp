"use client";

import { useEffect } from "react";
import type { AppLocale } from "./get-locale";

export interface DirectionProps {
  readonly locale: AppLocale;
}

/**
 * Client component to set document direction based on locale.
 * Keeps SSR minimal by adjusting on mount and when locale changes.
 */
export function Direction({ locale }: DirectionProps) {
  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", locale);
    }
  }, [locale]);
  return null;
}
