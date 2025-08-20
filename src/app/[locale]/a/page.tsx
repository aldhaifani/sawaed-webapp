"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  CalendarDays,
  Layers3,
  ListChecks,
  Plus,
  Users,
} from "lucide-react";

/**
 * Admin Dashboard (role: ADMIN)
 * Focuses on opportunities metrics with minimal youth info. Dummy data only.
 */
export default function AdminPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";
  const stats = useMemo(
    () =>
      [
        {
          id: "total",
          label: "Total Opportunities",
          value: 128,
          icon: Layers3,
        },
        { id: "open", label: "Open Now", value: 42, icon: BarChart3 },
        {
          id: "upcoming",
          label: "Upcoming (30d)",
          value: 19,
          icon: CalendarDays,
        },
        {
          id: "registrations",
          label: "Registrations (week)",
          value: 764,
          icon: Users,
        },
      ] as const,
    [],
  );

  const barSeries = useMemo(
    () => [12, 18, 10, 22, 26, 31, 28, 20, 16, 25, 33, 29] as const, // per month
    [],
  );

  const topCategories = useMemo(
    () =>
      [
        { label: "Workshops", value: 45 },
        { label: "Competitions", value: 26 },
        { label: "Volunteering", value: 21 },
        { label: "Hackathons", value: 18 },
      ] as const,
    [],
  );

  const recentYouth = useMemo(
    () =>
      [
        { id: "y1", name: "Ahmed Al-…", action: "Registered: Bootcamp" },
        {
          id: "y2",
          name: "Sara Al-…",
          action: "Applied: Innovation Challenge",
        },
        {
          id: "y3",
          name: "Yousef Al-…",
          action: "Registered: Volunteering Day",
        },
      ] as const,
    [],
  );

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <header className="mb-5 flex items-start justify-between gap-3 sm:mb-8">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Monitor opportunities and platform activity.
            </p>
          </div>
          <div className="hidden sm:block">
            <Button className="gap-2" asChild>
              <a href={`/${locale}/a/opportunities/create`}>
                <Plus className="size-4" /> New Opportunity
              </a>
            </Button>
          </div>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <article
              key={s.id}
              className="bg-card text-card-foreground rounded-2xl border p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    {s.label}
                  </p>
                  <p className="text-foreground mt-1 text-2xl font-bold">
                    {s.value}
                  </p>
                </div>
                <div className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-full border">
                  <s.icon className="size-5" />
                </div>
              </div>
              <div className="bg-muted mt-4 h-1.5 w-full overflow-hidden rounded-full">
                {/* decorative progress */}
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${35 + (i + 1) * 10}%`,
                    background: "var(--chart-1)",
                  }}
                />
              </div>
            </article>
          ))}
        </section>

        {/* Charts + Right column */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            {/* Bar chart card */}
            <article className="bg-card rounded-2xl border p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground text-base font-semibold">
                  Monthly Published Opportunities
                </h2>
                <Button size="sm" variant="outline" className="text-xs">
                  Export
                </Button>
              </div>
              {/* CSS bar chart */}
              <div className="bg-background relative h-48 w-full rounded-xl border p-3">
                <div className="absolute inset-3 grid grid-cols-12 items-end gap-2">
                  {barSeries.map((v, idx) => (
                    <div key={idx} className="flex h-full w-full items-end">
                      <div
                        className="w-full rounded-t-md"
                        style={{
                          height: `${v * 2}%`,
                          background:
                            idx % 3 === 0
                              ? "var(--chart-1)"
                              : idx % 3 === 1
                                ? "var(--chart-2)"
                                : "var(--chart-3)",
                          boxShadow: "var(--shadow-xs)",
                        }}
                        title={`Month ${idx + 1}: ${v}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </article>

            {/* Category distribution card */}
            <article className="bg-card rounded-2xl border p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground text-base font-semibold">
                  Top Opportunity Categories
                </h2>
                <ListChecks className="text-muted-foreground size-5" />
              </div>
              <ul className="space-y-3">
                {topCategories.map((c) => (
                  <li key={c.label} className="flex items-center gap-3">
                    <span className="text-muted-foreground w-28 shrink-0 text-xs">
                      {c.label}
                    </span>
                    <div className="flex w-full items-center gap-3">
                      <Progress value={Math.min(100, c.value)} />
                      <span className="text-foreground w-10 text-right text-xs font-medium">
                        {c.value}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          {/* Right column */}
          <aside className="space-y-6">
            <article className="bg-card rounded-2xl border p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground text-base font-semibold">
                  Quick Actions
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button className="gap-2" asChild>
                  <a href={`/${locale}/a/opportunities/create`}>
                    <Plus className="size-4" /> New Opportunity
                  </a>
                </Button>
                <Button variant="outline" className="gap-2" asChild>
                  <a href={`/${locale}/a/opportunities`}>
                    <Layers3 className="size-4" /> Manage All
                  </a>
                </Button>
              </div>
            </article>

            <article className="bg-card rounded-2xl border p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground text-base font-semibold">
                  Recent Youth Activity
                </h3>
              </div>
              <ul className="space-y-2">
                {recentYouth.map((y) => (
                  <li
                    key={y.id}
                    className="hover:bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="text-foreground truncate pr-2">
                      {y.name}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {y.action}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </aside>
        </div>
      </div>
    </main>
  );
}
