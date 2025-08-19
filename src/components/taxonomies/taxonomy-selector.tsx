"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { includesQuery } from "@/lib/search";

export type TaxonomyKind = "skill" | "interest";

export interface TaxonomySelectorProps {
  readonly kind: TaxonomyKind;
  readonly initialSelected?: readonly string[];
  readonly onChange?: (payload: { selectedIds: string[] }) => void;
}

interface Item {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
}

/**
 * TaxonomySelector provides bilingual search with category filtering for skills/interests.
 * - Client-side filtering using includesQuery with Arabic normalization.
 * - Emits selected IDs via onChange to allow host pages to persist selections.
 */
export function TaxonomySelector(props: TaxonomySelectorProps): ReactElement {
  const { kind, initialSelected = [], onChange } = props;
  const locale = useLocale() as "ar" | "en";
  const t = useTranslations("taxonomySelector");
  const [query, setQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    undefined,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [
    ...initialSelected,
  ]);

  const skills = useQuery(api.localization.listSkillsLocalizedWithMeta, {
    locale,
  });
  const interests = useQuery(api.localization.listInterestsLocalizedWithMeta, {
    locale,
  });

  const items: Item[] = useMemo(() => {
    if (kind === "skill") {
      return (skills ?? []).map(
        (s: { id: Id<"skills">; name: string; category?: string }) => ({
          id: s.id as unknown as string,
          name: s.name,
          category: s.category,
        }),
      );
    }
    return (interests ?? []).map(
      (i: { id: Id<"interests">; name: string; category?: string }) => ({
        id: i.id as unknown as string,
        name: i.name,
        category: i.category,
      }),
    );
  }, [kind, skills, interests]);

  const categories: string[] = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.category) set.add(it.category);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered: Item[] = useMemo(() => {
    const base = activeCategory
      ? items.filter((i) => i.category === activeCategory)
      : items;
    if (!query.trim()) return base;
    return base.filter((i) => includesQuery(i.name, query, locale));
  }, [items, activeCategory, query, locale]);

  useEffect(() => {
    onChange?.({ selectedIds });
  }, [selectedIds, onChange]);

  function add(id: string): void {
    if (selectedIds.includes(id)) return;
    setSelectedIds((prev) => [...prev, id]);
  }

  function remove(id: string): void {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  function clearAll(): void {
    setSelectedIds([]);
  }

  return (
    <section className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            kind === "skill"
              ? t("searchSkillsPlaceholder")
              : t("searchInterestsPlaceholder")
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label={t("searchAria")}
        />
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            {t("clear")}
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={t("categoriesAria")}>
          <button
            type="button"
            onClick={() => setActiveCategory(undefined)}
            className={`rounded-full border px-3 py-1 text-xs ${
              !activeCategory
                ? "border-blue-600 bg-blue-600 text-white"
                : "hover:bg-gray-50"
            }`}
          >
            {t("allCategories")}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs ${
                activeCategory === c
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">{t("browse")}</h3>
          <ul
            role="listbox"
            aria-multiselectable="true"
            className="max-h-64 divide-y overflow-auto rounded border"
          >
            {filtered.length === 0 && (
              <li className="p-3 text-sm text-gray-500">{t("noResults")}</li>
            )}
            {filtered.map((i) => (
              <li
                key={i.id}
                role="option"
                aria-selected={selectedIds.includes(i.id)}
                className="flex items-center justify-between p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{i.name}</p>
                  {i.category && (
                    <p className="truncate text-xs text-gray-500">
                      {i.category}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => add(i.id)}
                  disabled={selectedIds.includes(i.id)}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                  aria-disabled={selectedIds.includes(i.id)}
                >
                  {t("add")}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium">{t("selected")}</h3>
          {selectedIds.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noneSelected")}</p>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {selectedIds.map((id) => {
                const item = items.find((x) => x.id === id);
                if (!item) return null;
                return (
                  <li
                    key={id}
                    className="text-s flex items-center gap-2 rounded-md border border-zinc-200 bg-white/80 px-3 py-1 text-zinc-900 shadow-sm"
                  >
                    <span className="max-w-full truncate" title={item.name}>
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      className="rounded-full px-0 py-0"
                      aria-label={t("removeItemAria", { name: item.name })}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
