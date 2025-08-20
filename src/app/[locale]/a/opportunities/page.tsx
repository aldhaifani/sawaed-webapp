"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BasicDropdown from "@/components/ui/BasicDropdown";
import { Plus, Search, CalendarDays, MapPin, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

interface AdminOpportunity {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly location: string;
  readonly date: string;
  readonly status: "Draft" | "Published" | "Archived";
}

type StatusFilter = "All" | AdminOpportunity["status"];

export default function AdminOpportunitiesPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";
  const initial: readonly AdminOpportunity[] = useMemo(
    () => [
      {
        id: "op-101",
        title: "Digital Skills Bootcamp",
        summary:
          "Intensive 5-day program covering web fundamentals, teamwork, and presentation skills.",
        location: "Muscat",
        date: "Sep 10–14",
        status: "Published",
      },
      {
        id: "op-102",
        title: "National Youth Innovation Challenge",
        summary:
          "Submit a solution to a real civic challenge. Mentorship and grants for winners.",
        location: "Nationwide",
        date: "Oct 1–Nov 30",
        status: "Draft",
      },
      {
        id: "op-103",
        title: "Community Volunteering Day",
        summary:
          "Join a city-wide cleanup and community service day to support local neighborhoods.",
        location: "Salalah",
        date: "Aug 26",
        status: "Published",
      },
    ],
    [],
  );

  const [query, setQuery] = useState<string>("");
  const [list, setList] = useState<readonly AdminOpportunity[]>(initial);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byQuery = !q
      ? list
      : list.filter((d) =>
          [d.title, d.summary, d.location, d.status]
            .join(" ")
            .toLowerCase()
            .includes(q),
        );
    if (statusFilter === "All") return byQuery;
    return byQuery.filter((d) => d.status === statusFilter);
  }, [list, query, statusFilter]);

  function handleDelete(id: string, title: string): void {
    const ok: boolean = globalThis.window
      ? window.confirm(`Delete \"${title}\"?`)
      : true;
    if (!ok) return;
    setList((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              Opportunities
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage, create, edit, and publish opportunities.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href={`/${locale}/a/opportunities/create`}>
              <Plus className="size-4" /> New Opportunity
            </Link>
          </Button>
        </header>

        {/* Controls */}
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, summary, status…"
              className="pl-9"
            />
          </div>
          <BasicDropdown
            label="Status: All"
            items={[
              { id: "All", label: "All" },
              { id: "Published", label: "Published" },
              { id: "Draft", label: "Draft" },
              { id: "Archived", label: "Archived" },
            ]}
            onChange={(item) => setStatusFilter(item.id as StatusFilter)}
            className="shrink-0"
          />
        </div>

        {/* Grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((op) => (
            <article
              key={op.id}
              className="bg-card flex flex-col rounded-xl border p-4 shadow-sm"
            >
              <div className="flex-1">
                <h3
                  className="text-foreground line-clamp-1 text-base font-semibold"
                  title={op.title}
                >
                  {op.title}
                </h3>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {op.summary}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-background inline-flex items-center rounded-full border px-2 py-0.5">
                    <CalendarDays className="mr-1 size-3" /> {op.date}
                  </span>
                  <span className="bg-background inline-flex items-center rounded-full border px-2 py-0.5">
                    <MapPin className="mr-1 size-3" /> {op.location}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      op.status === "Published"
                        ? "bg-secondary text-secondary-foreground"
                        : op.status === "Draft"
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent text-foreground"
                    }`}
                  >
                    {op.status}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link
                    href={`/${locale}/a/opportunities/${op.id}/edit`}
                    className="inline-flex items-center gap-1"
                  >
                    <Edit className="size-4" /> Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(op.id, op.title)}
                  className="inline-flex items-center gap-1"
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </article>
          ))}
        </section>

        {filtered.length === 0 ? (
          <div className="bg-card mt-6 rounded-xl border p-8 text-center shadow-sm">
            <p className="text-foreground font-medium">No opportunities</p>
            <p className="text-muted-foreground text-sm">
              Try clearing the search query.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
