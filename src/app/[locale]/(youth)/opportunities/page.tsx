"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  Search,
  CalendarDays,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  Star,
  Filter,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BasicDropdown from "@/components/ui/BasicDropdown";
import { useTranslations } from "next-intl";

function Pill({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <span className="bg-background text-foreground/90 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
      {children}
    </span>
  );
}

function OpportunityCard({
  item,
  locale,
}: {
  item: {
    readonly id: string;
    readonly title: string;
    readonly summary: string;
    readonly location: string;
    readonly date: string;
    readonly tags: readonly string[];
    readonly source?: string;
    readonly badge?: string;
  };
  locale: string;
}): ReactElement {
  const t = useTranslations("opportunities.youthList");
  const tagList = item.tags.length
    ? item.tags
    : item.source
      ? [item.source]
      : [];
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
        {item.source ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Star className="size-3" /> {item.source.replace("-", " ")}
          </span>
        ) : (
          <span />
        )}
        <Button
          asChild
          variant="secondary"
          className="inline-flex items-center gap-1 text-xs md:text-sm"
        >
          <Link href={`/${locale}/opportunities/${item.id}`}>
            {t("viewDetails")} <ExternalLink className="size-4" />
          </Link>
        </Button>
      </div>
      <span className="group-hover:ring-ring/30 pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent transition-[box-shadow,ring-color]" />
    </article>
  );
}

export default function OpportunitiesPage(): ReactElement {
  const params = useParams<{ locale: string }>();
  const locale: string = params.locale ?? "ar";
  const t = useTranslations("opportunities.youthList");
  const [query, setQuery] = useState<string>("");
  const [regionId, setRegionId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [dateFromMs, setDateFromMs] = useState<number | undefined>(undefined);
  const [dateToMs, setDateToMs] = useState<number | undefined>(undefined);
  const [policy, setPolicy] = useState<"" | "open" | "approval" | "inviteOnly">(
    "",
  );
  const [registrationRequired, setRegistrationRequired] = useState<
    "" | "yes" | "no"
  >("");
  const [waitlistAllowed, setWaitlistAllowed] = useState<"" | "yes" | "no">("");
  const [capacityMin, setCapacityMin] = useState<string>("");

  // Load location options
  const regions = useQuery(api.locations.listRegions, {
    locale: locale as "ar" | "en",
  });
  const cities = useQuery(
    api.locations.listCitiesByRegion,
    regionId
      ? {
          regionId: regionId as unknown as Id<"regions">,
          locale: locale as "ar" | "en",
        }
      : "skip",
  );

  const eventQueryArgs = useMemo(
    () => ({
      searchText: query || undefined,
      locale: locale as "ar" | "en",
      regionId: regionId ? (regionId as unknown as Id<"regions">) : undefined,
      cityId: cityId ? (cityId as unknown as Id<"cities">) : undefined,
      startingDateFrom: dateFromMs,
      startingDateTo: dateToMs,
      registrationPolicy: policy || undefined,
      isRegistrationRequired:
        registrationRequired === ""
          ? undefined
          : registrationRequired === "yes"
            ? true
            : false,
      allowWaitlist:
        waitlistAllowed === ""
          ? undefined
          : waitlistAllowed === "yes"
            ? true
            : false,
      capacityMin: capacityMin ? Number(capacityMin) || 0 : undefined,
    }),
    [
      query,
      locale,
      regionId,
      cityId,
      dateFromMs,
      dateToMs,
      policy,
      registrationRequired,
      waitlistAllowed,
      capacityMin,
    ],
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.events.listPublicEventsPaginated,
    eventQueryArgs,
    { initialNumItems: 12 },
  );

  const canLoadMore = status === "CanLoadMore";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!results) return [] as typeof results;
    const arr = results;
    const mapped = arr.map((ev) => {
      const title = (locale === "ar" ? ev.titleAr : ev.titleEn) ?? "";
      const desc =
        (locale === "ar" ? ev.descriptionAr : ev.descriptionEn) ?? "";
      const dateRange =
        new Date(ev.startingDate).toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) +
        (ev.endingDate && ev.endingDate !== ev.startingDate
          ? "–" +
            new Date(ev.endingDate).toLocaleDateString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "");
      return {
        id: (ev._id as unknown as string) ?? "",
        title,
        summary: desc,
        location: ev.city ?? ev.region ?? "",
        date: dateRange,
        tags: [] as const,
        source: undefined as string | undefined,
        badge: undefined as string | undefined,
      } as const;
    });
    if (!q) return mapped;
    return mapped.filter((d) =>
      [d.title, d.summary, d.location].join(" ").toLowerCase().includes(q),
    );
  }, [results, query, locale]);

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </header>

        {/* Search + Filters Row */}
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-96">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
          {/* Filters Popover */}
          <div className="flex items-center gap-2">
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="size-4" /> {t("filters")}
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  sideOffset={8}
                  className="bg-background z-50 w-[min(92vw,680px)] rounded-xl border p-4 shadow-lg"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <BasicDropdown
                      label={`${t("regionLabel")}: ${regionId ? (regions?.find((r) => String(r.id) === regionId)?.name ?? "") : t("allOption")}`}
                      items={[
                        { id: "", label: t("allOption") },
                        ...(regions?.map((r) => ({
                          id: String(r.id),
                          label: r.name,
                        })) ?? []),
                      ]}
                      onChange={(item) => {
                        const id = item.id as string;
                        setRegionId(id);
                        setCityId("");
                      }}
                      className="shrink-0"
                    />
                    <BasicDropdown
                      label={`${t("cityLabel")}: ${regionId ? (cityId ? (cities?.find((c) => String(c.id) === cityId)?.name ?? "") : t("allOption")) : t("selectRegionFirst")}`}
                      items={
                        regionId
                          ? [
                              { id: "", label: t("allOption") },
                              ...(cities?.map((c) => ({
                                id: String(c.id),
                                label: c.name,
                              })) ?? []),
                            ]
                          : [{ id: "", label: t("selectRegionFirst") }]
                      }
                      onChange={(item) => setCityId(item.id as string)}
                      className="shrink-0"
                    />
                    <BasicDropdown
                      label={`${t("policyLabel")}: ${policy ? (policy === "open" ? t("policyOpen") : policy === "approval" ? t("policyApproval") : t("policyInviteOnly")) : t("allOption")}`}
                      items={[
                        { id: "", label: t("allOption") },
                        { id: "open", label: t("policyOpen") },
                        { id: "approval", label: t("policyApproval") },
                        { id: "inviteOnly", label: t("policyInviteOnly") },
                      ]}
                      onChange={(item) =>
                        setPolicy(
                          item.id as "" | "open" | "approval" | "inviteOnly",
                        )
                      }
                      className="shrink-0"
                    />

                    <BasicDropdown
                      label={`${t("waitlistLabel")}: ${waitlistAllowed === "" ? t("allOption") : waitlistAllowed === "yes" ? t("waitlistAllowed") : t("waitlistNotAllowed")}`}
                      items={[
                        { id: "", label: t("allOption") },
                        { id: "yes", label: t("waitlistAllowed") },
                        { id: "no", label: t("waitlistNotAllowed") },
                      ]}
                      onChange={(item) =>
                        setWaitlistAllowed(item.id as "" | "yes" | "no")
                      }
                      className="shrink-0"
                    />
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <Button variant="outline" className="justify-start">
                          <CalendarDays className="mr-2 size-4" />{" "}
                          {t("dateStartFrom")}:{" "}
                          {dateFromMs
                            ? new Date(dateFromMs).toLocaleString(locale)
                            : t("allOption")}
                        </Button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          sideOffset={8}
                          className="bg-background z-50 rounded-xl border p-2 shadow-lg"
                        >
                          <DateTimePicker
                            label={t("dateStartFrom")}
                            valueMs={dateFromMs}
                            onChange={setDateFromMs}
                          />
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <Button variant="outline" className="justify-start">
                          <CalendarDays className="mr-2 size-4" />{" "}
                          {t("dateStartTo")}:{" "}
                          {dateToMs
                            ? new Date(dateToMs).toLocaleString(locale)
                            : t("allOption")}
                        </Button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          sideOffset={8}
                          className="bg-background z-50 rounded-xl border p-2 shadow-lg"
                        >
                          <DateTimePicker
                            label={t("dateStartTo")}
                            valueMs={dateToMs}
                            onChange={setDateToMs}
                          />
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                    <BasicDropdown
                      label={`${t("registrationLabel")}: ${registrationRequired === "" ? t("allOption") : registrationRequired === "yes" ? t("registrationRequired") : t("registrationOptional")}`}
                      items={[
                        { id: "", label: t("allOption") },
                        { id: "yes", label: t("registrationRequired") },
                        { id: "no", label: t("registrationOptional") },
                      ]}
                      onChange={(item) =>
                        setRegistrationRequired(item.id as "" | "yes" | "no")
                      }
                      className="shrink-0"
                    />

                    <div className="flex items-center gap-2">
                      <label className="text-muted-foreground text-sm">
                        {t("minCapacityLabel")}
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={capacityMin}
                        onChange={(e) => setCapacityMin(e.target.value)}
                        className="max-w-40"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateFromMs(undefined);
                        setDateToMs(undefined);
                        setPolicy("");
                        setRegistrationRequired("");
                        setWaitlistAllowed("");
                        setCapacityMin("");
                        setRegionId("");
                        setCityId("");
                      }}
                    >
                      {t("resetFilters")}
                    </Button>
                    <Popover.Close asChild>
                      <Button>{t("done")}</Button>
                    </Popover.Close>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-muted-foreground mb-3 text-xs">
          {t("resultsCount", { count: filtered.length })}
        </div>

        {/* Grid */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((op) => (
            <OpportunityCard key={op.id} item={op} locale={locale} />
          ))}
        </section>

        {/* Empty State */}
        {filtered.length === 0 ? (
          <div className="bg-card mt-6 rounded-xl border p-8 text-center shadow-sm">
            <Clock className="text-muted-foreground mx-auto mb-2 size-6" />
            <p className="text-foreground font-medium">{t("emptyTitle")}</p>
            <p className="text-muted-foreground text-sm">{t("emptyHint")}</p>
          </div>
        ) : null}

        {/* Pagination */}
        <div className="mt-6 flex justify-center">
          {canLoadMore ? (
            <Button onClick={() => loadMore(12)} variant="outline">
              {t("loadMore")}
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
