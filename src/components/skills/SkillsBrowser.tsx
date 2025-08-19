"use client";

import { useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { includesQuery } from "@/lib/search";

export function SkillsBrowser(): ReactElement {
  const locale = useLocale() as "ar" | "en";
  const t = useTranslations("skillsBrowser");
  const [query, setQuery] = useState<string>("");
  const skills =
    useQuery(api.localization.listSkillsLocalized, { locale }) ?? [];
  const filtered = skills.filter((s) => includesQuery(s.name, query, locale));
  return (
    <section className="w-full max-w-3xl space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-md border border-zinc-300 bg-white/90 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filtered.map((s) => (
          <li
            key={s.id}
            className="rounded-md border border-zinc-200 bg-white/80 px-3 py-2 text-zinc-900 shadow-sm"
          >
            {s.name}
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-zinc-200/90">{t("noResults")}</li>
        )}
      </ul>
    </section>
  );
}
