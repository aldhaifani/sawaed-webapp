"use client";

import type { ReactElement } from "react";
import { useMemo, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Trophy,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";

function SectionCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}): ReactElement {
  return (
    <section className="bg-card rounded-2xl border shadow-sm">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        {right ? <div className="shrink-0">{right}</div> : null}
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

interface OpportunityItem {
  readonly id: string;
  readonly title: string;
  readonly location: string;
  readonly hours: string;
}

interface ActivityItem {
  readonly regId: string;
  readonly eventId: string;
  readonly title: string;
  readonly location: string;
  readonly hours: string;
  readonly status:
    | "Accepted"
    | "Pending"
    | "Withdrawn"
    | "Rejected"
    | "Waitlisted";
}

type RegistrationStatus =
  | "accepted"
  | "pending"
  | "cancelled"
  | "rejected"
  | "waitlisted";

interface RegistrationSummary {
  readonly _id: string;
  readonly eventId: string;
  readonly status: RegistrationStatus;
}

export default function YouthDashboardPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "ar";
  const t = useTranslations();
  const router = useRouter();
  const status = useQuery(api.onboarding.getStatus, {});

  useEffect(() => {
    if (!status) return; // loading
    if (!status.completed) router.replace(`/${locale}/onboarding`);
  }, [status, router, locale]);

  // Dummy data (Learning Path only)
  const progress = 55;
  const modules = useMemo(
    () => [
      {
        id: 1,
        label: "Module #1",
        title: "Foundations of Digital Marketing",
        done: true,
      },
      {
        id: 2,
        label: "Module #2",
        title: "Search Engine Optimization Basics",
        done: true,
      },
      {
        id: 3,
        label: "Module #3",
        title: "Social Media Marketing",
        done: true,
      },
      {
        id: 4,
        label: "Module #4",
        title: "Content Creation Essentials",
        done: false,
      },
      { id: 5, label: "Module #5", title: "Final Project", done: false },
    ],
    [],
  );

  // Latest published events (Suggested Opportunities)
  const { results: latestEvents } = usePaginatedQuery(
    api.events.listPublicEventsPaginated,
    { locale },
    { initialNumItems: 2 },
  );

  const opportunities: readonly OpportunityItem[] = useMemo(() => {
    if (!latestEvents) return [] as readonly OpportunityItem[];
    return latestEvents.map((ev) => {
      const title = (locale === "ar" ? ev.titleAr : ev.titleEn) ?? "";
      const start = typeof ev.startingDate === "number" ? ev.startingDate : 0;
      const end = typeof ev.endingDate === "number" ? ev.endingDate : start;
      const durMs = Math.max(0, end - start);
      const durHrs = Math.max(1, Math.round(durMs / (1000 * 60 * 60)));
      return {
        id: String(ev._id ?? ""),
        title,
        location: ev.city ?? ev.region ?? "",
        hours: t("dashboard.youth.hoursShort", { hours: durHrs }),
      } as const;
    });
  }, [latestEvents, locale, t]);

  // Real profile completion data (also contains activities)
  const composite = useQuery(api.profiles.getMyProfileComposite, { locale });
  const completion = composite?.profile?.completionPercentage ?? 0;
  const identityDone = useMemo(() => {
    const nameOk = Boolean(
      composite?.user?.firstName && composite?.user?.lastName,
    );
    const bioOk = Boolean(
      composite?.profile?.bio ?? composite?.profile?.headline,
    );
    const locationOk = Boolean(
      composite?.profile?.city ?? composite?.profile?.region,
    );
    return nameOk && bioOk && locationOk;
  }, [
    composite?.user?.firstName,
    composite?.user?.lastName,
    composite?.profile?.bio,
    composite?.profile?.headline,
    composite?.profile?.city,
    composite?.profile?.region,
  ]);
  const firstName = composite?.user?.firstName ?? "";
  // Latest user activities (event registrations) enriched with event details
  const latestRegs = useMemo<readonly RegistrationSummary[]>(() => {
    type UnknownReg = Partial<{
      _id: string | number;
      eventId: string | number;
      status: string;
    }>;
    const raw = (composite?.activities ?? []) as ReadonlyArray<UnknownReg>;
    const toStringSafe = (v: unknown): string =>
      typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
    const toStatus = (v: unknown): RegistrationStatus =>
      v === "accepted" ||
      v === "pending" ||
      v === "cancelled" ||
      v === "rejected" ||
      v === "waitlisted"
        ? v
        : "pending";
    return raw.slice(0, 2).map((r) => ({
      _id: toStringSafe(r._id),
      eventId: toStringSafe(r.eventId),
      status: toStatus(r.status),
    }));
  }, [composite?.activities]);
  const ev1Id = latestRegs[0]?.eventId;
  const ev2Id = latestRegs[1]?.eventId;
  const ev1 = useQuery(
    api.events.getPublicEventById,
    ev1Id ? { id: ev1Id as Id<"events">, locale } : "skip",
  );
  const ev2 = useQuery(
    api.events.getPublicEventById,
    ev2Id ? { id: ev2Id as Id<"events">, locale } : "skip",
  );
  const activities: readonly ActivityItem[] = useMemo(() => {
    const mapStatus = (s: string | undefined): ActivityItem["status"] => {
      switch (s) {
        case "accepted":
          return "Accepted";
        case "pending":
          return "Pending";
        case "cancelled":
          return "Withdrawn";
        case "rejected":
          return "Rejected";
        case "waitlisted":
          return "Waitlisted";
        default:
          return "Pending";
      }
    };
    const regs = latestRegs;
    const evs = [ev1, ev2];
    const items: ActivityItem[] = [];
    regs.forEach((r, idx) => {
      const ev = evs[idx];
      if (!r || !ev) return;
      const title = (locale === "ar" ? ev.titleAr : ev.titleEn) ?? "";
      const start = typeof ev.startingDate === "number" ? ev.startingDate : 0;
      const end = typeof ev.endingDate === "number" ? ev.endingDate : start;
      const durMs = Math.max(0, end - start);
      const durHrs = Math.max(1, Math.round(durMs / (1000 * 60 * 60)));
      items.push({
        regId: r._id || String(idx),
        eventId: r.eventId,
        title,
        location: ev.city ?? ev.region ?? "",
        hours: t("dashboard.youth.hoursShort", { hours: durHrs }),
        status: mapStatus(r.status),
      });
    });
    return items;
  }, [latestRegs, ev1, ev2, locale, t]);
  const checklist = useMemo(
    () =>
      [
        {
          label: `${t("profile.tabs.identity")} (20%)`,
          completed: identityDone,
        },
        {
          label: `${t("profile.tabs.skills")} (20%)`,
          completed: (composite?.skills?.length ?? 0) > 0,
        },
        {
          label: `${t("profile.tabs.interests")} (15%)`,
          completed: (composite?.interests?.length ?? 0) > 0,
        },
        {
          label: `${t("profile.tabs.education")} (15%)`,
          completed: (composite?.education?.length ?? 0) > 0,
        },
        {
          label: `${t("profile.tabs.projects")} (10%)`,
          completed: (composite?.projects?.length ?? 0) > 0,
        },
        {
          label: `${t("profile.tabs.experience")} (10%)`,
          completed: (composite?.experiences?.length ?? 0) > 0,
        },
        {
          label: `${t("profile.tabs.awards")} (10%)`,
          completed: (composite?.awards?.length ?? 0) > 0,
        },
      ] as const,
    [
      t,
      identityDone,
      composite?.skills?.length,
      composite?.interests?.length,
      composite?.education?.length,
      composite?.projects?.length,
      composite?.experiences?.length,
      composite?.awards?.length,
    ],
  );

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Hero greeting */}
        <header className="mb-4 sm:mb-6">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            {t("dashboard.youth.welcomeBack", { name: firstName })}
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Learning Path */}
            <SectionCard
              title="Learning Path"
              right={
                <Button variant="outline" className="gap-1 text-xs sm:text-sm">
                  View Details{" "}
                  {locale === "ar" ? (
                    <ChevronLeft className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Button>
              }
            >
              <div className="mb-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                <span>Current Level: lvl 1</span>
                <span>Goal: reach lvl 2</span>
                <div className="flex items-center gap-2">
                  <span>Progress:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-36 sm:w-56">
                      <Progress value={progress} className="h-1.5" />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {progress}%
                    </span>
                  </div>
                </div>
              </div>
              {/* Milestones timeline */}
              <div className="rounded-xl border p-4 shadow-xs sm:p-5">
                <div className="relative">
                  {/* background connector behind circles */}
                  <div className="bg-border absolute top-3 right-[5%] left-[5%] z-0 hidden h-1 rounded-full sm:block" />
                  <ol className="relative z-10 grid grid-cols-5 items-start gap-2">
                    {modules.map((m, i) => {
                      const next =
                        !m.done && modules.slice(0, i).every((x) => x.done);
                      return (
                        <li
                          key={m.id}
                          className="flex flex-col items-center gap-2"
                        >
                          <div
                            className={`relative z-10 grid size-7 place-items-center rounded-full border transition-shadow ${
                              m.done
                                ? "bg-primary text-primary-foreground border-primary"
                                : next
                                  ? "bg-secondary text-secondary-foreground ring-primary/30 ring-2"
                                  : "bg-muted text-muted-foreground"
                            } ${next ? "animate-pulse" : ""}`}
                          >
                            {m.done ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <Circle className="size-3" />
                            )}
                          </div>
                          <div className="text-center">
                            <div
                              className="text-foreground text-[10px] font-medium sm:text-xs"
                              title={m.title}
                            >
                              {m.label}
                            </div>
                            <div
                              className="text-muted-foreground mt-0.5 line-clamp-2 text-[10px] sm:text-xs"
                              title={m.title}
                            >
                              {m.title}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </SectionCard>

            {/* Two-up: Suggested Opportunities & My activities */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SectionCard
                title={t("dashboard.youth.suggested.title")}
                right={
                  <Button
                    variant="outline"
                    className="gap-1 text-xs sm:text-sm"
                    onClick={() => router.push(`/${locale}/opportunities`)}
                  >
                    {t("dashboard.youth.suggested.viewAll")}{" "}
                    {locale === "ar" ? (
                      <ChevronLeft className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </Button>
                }
              >
                <ul className="space-y-3">
                  {opportunities.map((op) => (
                    <li
                      key={op.id}
                      className="bg-background flex flex-col gap-4 rounded-xl border p-4 shadow-xs transition-shadow hover:shadow-sm"
                    >
                      <div className="flex w-full justify-start gap-4">
                        <div className="bg-muted text-muted-foreground grid size-12 shrink-0 place-items-center rounded-lg border">
                          <Trophy className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-sm font-semibold text-wrap">
                            {op.title}
                          </p>
                          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" /> {op.hours}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" /> {op.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full justify-center gap-4">
                        <Button
                          size="sm"
                          className="w-[60%] text-xs"
                          onClick={() =>
                            router.push(`/${locale}/opportunities/${op.id}`)
                          }
                        >
                          {t("dashboard.youth.suggested.apply")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-[30%] text-xs"
                        >
                          {t("dashboard.youth.suggested.ignore")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard
                title={t("dashboard.youth.myActivities.title")}
                right={
                  <Button
                    variant="outline"
                    className="gap-1 text-xs sm:text-sm"
                    onClick={() =>
                      router.push(`/${locale}/profile?tab=activities`)
                    }
                  >
                    {t("dashboard.youth.myActivities.viewAll")}{" "}
                    {locale === "ar" ? (
                      <ChevronLeft className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </Button>
                }
              >
                <ul className="space-y-3">
                  {activities.map((ac) => (
                    <li
                      key={ac.regId}
                      className="bg-background flex flex-col gap-4 rounded-xl border p-4 shadow-xs transition-shadow hover:shadow-sm"
                    >
                      <div className="flex w-full justify-start gap-4">
                        <div className="flex flex-col justify-center gap-1">
                          <div className="bg-muted text-muted-foreground grid size-12 shrink-0 place-items-center rounded-lg border">
                            <CalendarDays className="size-5" />
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              ac.status === "Accepted"
                                ? "bg-green-100 text-green-700"
                                : ac.status === "Pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : ac.status === "Rejected"
                                    ? "bg-red-100 text-red-700"
                                    : ac.status === "Waitlisted"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {ac.status === "Accepted"
                              ? t("profile.activities.status.accepted")
                              : ac.status === "Pending"
                                ? t("profile.activities.status.pending")
                                : ac.status === "Rejected"
                                  ? t("profile.activities.status.rejected")
                                  : ac.status === "Waitlisted"
                                    ? t("profile.activities.status.waitlisted")
                                    : t("profile.activities.status.cancelled")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-sm font-semibold text-wrap">
                            {ac.title}
                          </p>
                          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" /> {ac.hours}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" /> {ac.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full justify-center gap-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-[60%] text-xs"
                          onClick={() =>
                            router.push(
                              `/${locale}/opportunities/${ac.eventId}`,
                            )
                          }
                        >
                          {t("dashboard.youth.myActivities.viewInfo")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-[30%] text-xs"
                        >
                          {t("dashboard.youth.myActivities.withdraw")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">
            {/* Profile Completion */}
            <section className="bg-card rounded-2xl border p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-foreground text-base font-semibold">
                    {t("profile.labels.completion")}
                  </h3>
                </div>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => router.push(`/${locale}/profile`)}
                >
                  {t("profile.dialog.editProfile")}
                </Button>
              </div>
              <div className="mb-2 text-center">
                <div className="text-muted-foreground mb-1 text-xs">
                  {completion}%
                </div>
                <div className="w-full">
                  <Progress value={completion} className="h-1.5" />
                </div>
              </div>
              <ul className="space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    {c.completed ? (
                      <CheckCircle2 className="size-4 text-green-600" />
                    ) : (
                      <Circle className="text-muted-foreground size-4" />
                    )}
                    <span
                      className={
                        c.completed
                          ? "decoration-foreground/30 text-muted-foreground line-through"
                          : "text-foreground"
                      }
                    >
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Quick Links */}
            <section className="bg-card rounded-2xl border p-4 shadow-sm sm:p-6">
              <h3 className="text-foreground mb-3 text-base font-semibold">
                Quick Links
              </h3>
              <ul className="space-y-2 text-sm">
                {["Inbox", "Support Tickets", "Find a peer"].map((l) => (
                  <li
                    key={l}
                    className="hover:bg-muted flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <span>{l}</span>
                    <Button size="icon" variant="outline" className="size-7">
                      <ExternalLink className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
