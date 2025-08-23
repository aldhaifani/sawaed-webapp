"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useLocale, useTranslations } from "next-intl";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import BasicDropdown from "@/components/ui/BasicDropdown";
import { Plus, Search, CalendarDays, MapPin, Edit, Filter } from "lucide-react";
import Link from "next/link";
import { useConvexAuth } from "convex/react";

type StatusFilter = "All" | "Published" | "Draft";

export default function AdminOpportunitiesPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";
  const t = useTranslations("opportunities.adminList");
  const { isAuthenticated } = useConvexAuth();
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
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
  const regions = useQuery(api.locations.listRegions, { locale });
  const cities = useQuery(
    api.locations.listCitiesByRegion,
    regionId
      ? { regionId: regionId as unknown as Id<"regions">, locale }
      : "skip",
  );

  const eventQueryArgs = useMemo(
    () => ({
      searchText: query || undefined,
      status: statusFilter,
      locale,
      regionId: regionId ? (regionId as unknown as Id<"regions">) : undefined,
      cityId: cityId ? (cityId as unknown as Id<"cities">) : undefined,
      startingDateFrom: dateFromMs,
      startingDateTo: dateToMs,
      registrationPolicy: policy || undefined,
      isRegistrationRequired: registrationRequired
        ? registrationRequired === "yes"
          ? true
          : false
        : undefined,
      allowWaitlist: waitlistAllowed
        ? waitlistAllowed === "yes"
          ? true
          : false
        : undefined,
      capacityMin: capacityMin ? Number(capacityMin) || 0 : undefined,
    }),
    [
      query,
      statusFilter,
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
    api.events.listAdminEventsPaginated,
    isAuthenticated ? eventQueryArgs : "skip",
    { initialNumItems: 12 },
  );

  const canLoadMore = status === "CanLoadMore";
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return results ?? [];
    return (results ?? []).filter((ev) => {
      const title = (locale === "ar" ? ev.titleAr : ev.titleEn) ?? "";
      const desc =
        (locale === "ar" ? ev.descriptionAr : ev.descriptionEn) ?? "";
      return `${title} ${desc}`.toLowerCase().includes(q);
    });
  }, [results, query, locale]);

  function formatDateTimeLabel(ms?: number): string {
    if (!ms) return t("allOption", { defaultMessage: "All" });
    try {
      return new Date(ms).toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return t("allOption", { defaultMessage: "All" });
    }
  }

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("subtitle")}
            </p>
          </div>

          {/* Advanced filters moved into Popover below */}
          <Button asChild className="gap-2">
            <Link href={`/${locale}/a/opportunities/create`}>
              <Plus className="size-4" /> {t("new")}
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
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="size-4" />
                  {t("filters", { defaultMessage: "Filters" })}
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  sideOffset={8}
                  className="bg-background z-50 w-[min(92vw,680px)] rounded-xl border p-4 shadow-lg"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <BasicDropdown
                      label={`${t("statusLabel")}: ${t(`status.${statusFilter}`)}`}
                      items={[
                        { id: "All", label: t("status.All") },
                        { id: "Published", label: t("status.Published") },
                        { id: "Draft", label: t("status.Draft") },
                      ]}
                      onChange={(item) =>
                        setStatusFilter(item.id as StatusFilter)
                      }
                      className="shrink-0"
                    />
                    <BasicDropdown
                      label={`${t("regionLabel", { defaultMessage: "Region" })}: ${regionId ? (regions?.find((r) => String(r.id) === regionId)?.name ?? "") : t("allOption", { defaultMessage: "All" })}`}
                      items={[
                        {
                          id: "",
                          label: t("allOption", { defaultMessage: "All" }),
                        },
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
                      label={`${t("cityLabel", { defaultMessage: "City" })}: ${
                        regionId
                          ? cityId
                            ? (cities?.find((c) => String(c.id) === cityId)
                                ?.name ?? "")
                            : t("allOption", { defaultMessage: "All" })
                          : t("selectRegionFirst", {
                              defaultMessage: "Select region first",
                            })
                      }`}
                      items={
                        regionId
                          ? [
                              {
                                id: "",
                                label: t("allOption", {
                                  defaultMessage: "All",
                                }),
                              },
                              ...(cities?.map((c) => ({
                                id: String(c.id),
                                label: c.name,
                              })) ?? []),
                            ]
                          : [
                              {
                                id: "",
                                label: t("selectRegionFirst", {
                                  defaultMessage: "Select region first",
                                }),
                              },
                            ]
                      }
                      onChange={(item) => setCityId(item.id as string)}
                      className="shrink-0"
                    />
                    <BasicDropdown
                      label={`${t("policyLabel", { defaultMessage: "Policy" })}: ${policy || t("allOption", { defaultMessage: "All" })}`}
                      items={[
                        {
                          id: "",
                          label: t("allOption", { defaultMessage: "All" }),
                        },
                        {
                          id: "open",
                          label: t("policyOpen", { defaultMessage: "Open" }),
                        },
                        {
                          id: "approval",
                          label: t("policyApproval", {
                            defaultMessage: "Approval",
                          }),
                        },
                        {
                          id: "inviteOnly",
                          label: t("policyInviteOnly", {
                            defaultMessage: "Invite Only",
                          }),
                        },
                      ]}
                      onChange={(item) =>
                        setPolicy(
                          item.id as "" | "open" | "approval" | "inviteOnly",
                        )
                      }
                      className="shrink-0"
                    />
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <Button variant="outline" className="justify-start">
                          <CalendarDays className="mr-2 size-4" />
                          {t("dateStartFrom", { defaultMessage: "Start from" })}
                          {": "}
                          {formatDateTimeLabel(dateFromMs)}
                        </Button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          sideOffset={8}
                          className="bg-background z-50 rounded-xl border p-2 shadow-lg"
                        >
                          <DateTimePicker
                            label={t("dateStartFrom", {
                              defaultMessage: "Start from",
                            })}
                            valueMs={dateFromMs}
                            onChange={setDateFromMs}
                          />
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <Button variant="outline" className="justify-start">
                          <CalendarDays className="mr-2 size-4" />
                          {t("dateStartTo", { defaultMessage: "Start to" })}
                          {": "}
                          {formatDateTimeLabel(dateToMs)}
                        </Button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          sideOffset={8}
                          className="bg-background z-50 rounded-xl border p-2 shadow-lg"
                        >
                          <DateTimePicker
                            label={t("dateStartTo", {
                              defaultMessage: "Start to",
                            })}
                            valueMs={dateToMs}
                            onChange={setDateToMs}
                          />
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>

                    <BasicDropdown
                      label={`${t("registrationLabel", { defaultMessage: "Registration" })}: ${registrationRequired === "" ? t("allOption", { defaultMessage: "All" }) : registrationRequired === "yes" ? t("registrationRequired", { defaultMessage: "Required" }) : t("registrationOptional", { defaultMessage: "Optional" })}`}
                      items={[
                        {
                          id: "",
                          label: t("allOption", { defaultMessage: "All" }),
                        },
                        {
                          id: "yes",
                          label: t("registrationRequired", {
                            defaultMessage: "Required",
                          }),
                        },
                        {
                          id: "no",
                          label: t("registrationOptional", {
                            defaultMessage: "Optional",
                          }),
                        },
                      ]}
                      onChange={(item) =>
                        setRegistrationRequired(item.id as "" | "yes" | "no")
                      }
                      className="shrink-0"
                    />
                    <BasicDropdown
                      label={`${t("waitlistLabel", { defaultMessage: "Waitlist" })}: ${waitlistAllowed === "" ? t("allOption", { defaultMessage: "All" }) : waitlistAllowed === "yes" ? t("waitlistAllowed", { defaultMessage: "Allowed" }) : t("waitlistNotAllowed", { defaultMessage: "Not allowed" })}`}
                      items={[
                        {
                          id: "",
                          label: t("allOption", { defaultMessage: "All" }),
                        },
                        {
                          id: "yes",
                          label: t("waitlistAllowed", {
                            defaultMessage: "Allowed",
                          }),
                        },
                        {
                          id: "no",
                          label: t("waitlistNotAllowed", {
                            defaultMessage: "Not allowed",
                          }),
                        },
                      ]}
                      onChange={(item) =>
                        setWaitlistAllowed(item.id as "" | "yes" | "no")
                      }
                      className="shrink-0"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-muted-foreground text-sm">
                        {t("minCapacityLabel", {
                          defaultMessage: "Min capacity",
                        })}
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
                        setStatusFilter("All");
                      }}
                    >
                      {t("resetFilters", {
                        defaultMessage: "Reset all filters",
                      })}
                    </Button>
                    <Popover.Close asChild>
                      <Button>{t("done", { defaultMessage: "Done" })}</Button>
                    </Popover.Close>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

        {/* Grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResults?.map((ev) => {
            const title = locale === "ar" ? ev.titleAr : ev.titleEn;
            const date = new Date(ev.startingDate).toLocaleDateString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const location = ev.city ?? ev.region ?? "";
            const statusText = ev.isPublished ? t("published") : t("draft");
            return (
              <article
                key={(ev._id as unknown as string) ?? ""}
                className="bg-card flex flex-col rounded-xl border p-4 shadow-sm"
              >
                <div className="flex-1">
                  <h3
                    className="text-foreground line-clamp-1 text-base font-semibold"
                    title={title}
                  >
                    {title}
                  </h3>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-background inline-flex items-center rounded-full border px-2 py-0.5">
                      <CalendarDays className="mr-1 size-3" /> {date}
                    </span>
                    {location ? (
                      <span className="bg-background inline-flex items-center rounded-full border px-2 py-0.5">
                        <MapPin className="mr-1 size-3" /> {location}
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        ev.isPublished
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {statusText}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  {ev.canEdit ? (
                    <Button variant="secondary" size="sm" asChild>
                      <Link
                        href={`/${locale}/a/opportunities/${(ev._id as unknown as string) ?? ""}/manage`}
                        className="inline-flex items-center gap-1"
                      >
                        <Edit className="size-4" />{" "}
                        {t("manage", { defaultMessage: "Manage" })}
                      </Link>
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {filteredResults && filteredResults.length === 0 ? (
          <div className="bg-card mt-6 rounded-xl border p-8 text-center shadow-sm">
            <p className="text-foreground font-medium">{t("emptyTitle")}</p>
            <p className="text-muted-foreground text-sm">{t("emptyHint")}</p>
          </div>
        ) : null}

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
