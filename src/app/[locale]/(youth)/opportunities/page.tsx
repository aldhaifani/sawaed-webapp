"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import {
  Filter,
  Search,
  CalendarDays,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BasicDropdown from "@/components/ui/BasicDropdown";

type SourceKey = "all" | "youth-center" | "general-directorate" | "ministry";

interface Opportunity {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly location: string;
  readonly date: string; // ISO or human string
  readonly tags: readonly string[];
  readonly source: Exclude<SourceKey, "all">;
  readonly badge?: "NEW" | "UPCOMING" | "CLOSING SOON";
}

function sourceLabel(src: Exclude<SourceKey, "all">): string {
  if (src === "youth-center") return "Youth Center";
  if (src === "general-directorate") return "General Directorate of Youth";
  return "Ministry";
}

function Pill({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <span className="bg-background text-foreground/90 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
      {children}
    </span>
  );
}

function OpportunityCard({ item }: { item: Opportunity }): ReactElement {
  const tagList = item.tags.length ? item.tags : [sourceLabel(item.source)];
  return (
    <article
      className={
        `bg-card group relative flex flex-col justify-between rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ` +
        (item.source === "youth-center"
          ? "border-primary border-l-4"
          : item.source === "general-directorate"
            ? "border-secondary border-l-4"
            : "border-accent border-l-4")
      }
    >
      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg border">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="text-foreground truncate text-sm font-semibold md:text-base"
            title={item.title}
          >
            {item.title}
          </h3>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs md:text-sm">
            {item.summary}
          </p>
        </div>
        {item.badge ? (
          <span
            className={
              `rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide ` +
              (item.badge === "NEW"
                ? "bg-primary text-primary-foreground"
                : item.badge === "UPCOMING"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-destructive text-destructive-foreground")
            }
          >
            {item.badge}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill>
          <CalendarDays className="mr-1 size-3" /> {item.date}
        </Pill>
        <Pill>
          <MapPin className="mr-1 size-3" /> {item.location}
        </Pill>
        {tagList.map((t) => (
          <Pill key={t}>{t}</Pill>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <Star className="size-3" /> {item.source.replace("-", " ")}
        </span>
        <Button
          variant="secondary"
          className="inline-flex items-center gap-1 text-xs md:text-sm"
        >
          View Details <ExternalLink className="size-4" />
        </Button>
      </div>
      <span className="group-hover:ring-ring/30 pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent transition-[box-shadow,ring-color]" />
    </article>
  );
}

export default function OpportunitiesPage(): ReactElement {
  const [query, setQuery] = useState<string>("");
  const [tab, setTab] = useState<SourceKey>("all");

  const tabs = useMemo(
    () =>
      [
        { id: "all", label: "All" },
        { id: "youth-center", label: "Youth Center" },
        { id: "general-directorate", label: "General Directorate of Youth" },
        { id: "ministry", label: "Ministry" },
      ] as const,
    [],
  );

  const data: readonly Opportunity[] = useMemo(
    () =>
      [
        {
          id: "1",
          title: "Digital Skills Bootcamp",
          summary:
            "Intensive 5-day program covering web fundamentals, teamwork, and presentation skills.",
          location: "Muscat",
          date: "Sep 10–14",
          tags: ["Workshop", "Beginner"],
          source: "youth-center",
          badge: "NEW",
        },
        {
          id: "2",
          title: "National Youth Innovation Challenge",
          summary:
            "Submit a solution to a real civic challenge. Selected teams receive mentoring and grants.",
          location: "Nationwide",
          date: "Oct 1–Nov 30",
          tags: ["Competition", "Team"],
          source: "general-directorate",
        },
        {
          id: "3",
          title: "Community Volunteering Day",
          summary:
            "Join a city-wide cleanup and community service day to support local neighborhoods.",
          location: "Salalah",
          date: "Aug 26",
          tags: ["Volunteering"],
          source: "ministry",
          badge: "UPCOMING",
        },
        {
          id: "4",
          title: "AI for Good – Hack Weekend",
          summary:
            "48-hour hackathon focused on accessibility and environmental datasets.",
          location: "Muscat",
          date: "Sep 27–29",
          tags: ["Hackathon", "Intermediate"],
          source: "youth-center",
          badge: "CLOSING SOON",
        },
        {
          id: "5",
          title: "Photography Walk – Old Muscat",
          summary:
            "Guided photo walk with mentors; best shots featured on official channels.",
          location: "Old Muscat",
          date: "Sep 6",
          tags: ["Creative", "Outdoor"],
          source: "general-directorate",
        },
      ] as const,
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((d) => {
      const byTab = tab === "all" ? true : d.source === tab;
      const bySearch = q
        ? [d.title, d.summary, d.location, d.tags.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(q)
        : true;
      return byTab && bySearch;
    });
  }, [data, query, tab]);

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            Opportunities
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Discover workshops, events, and programs curated for youth.
          </p>
        </header>

        {/* Tabs + Search Row */}
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="bg-card hidden rounded-lg border p-1 shadow-sm md:inline-flex">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id as SourceKey)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === (t.id as SourceKey)
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Mobile dropdown */}
            <div className="w-full md:hidden">
              <BasicDropdown
                className="w-full"
                label={tabs.find((t) => t.id === tab)?.label ?? tabs[0].label}
                items={tabs.map((t) => ({ id: t.id, label: t.label }))}
                onChange={(i) => setTab(i.id as SourceKey)}
              />
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search opportunities"
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="shrink-0">
              <Filter className="mr-2 size-4" /> Filter
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-muted-foreground mb-3 text-xs">
          {filtered.length} results
        </div>

        {/* Grid */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((op) => (
            <OpportunityCard key={op.id} item={op} />
          ))}
        </section>

        {/* Empty State */}
        {filtered.length === 0 ? (
          <div className="bg-card mt-6 rounded-xl border p-8 text-center shadow-sm">
            <Clock className="text-muted-foreground mx-auto mb-2 size-6" />
            <p className="text-foreground font-medium">
              No opportunities found
            </p>
            <p className="text-muted-foreground text-sm">
              Try clearing the search or switching tabs.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
