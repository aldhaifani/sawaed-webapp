"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users2,
  UserCheck,
  UserPlus,
  Activity,
  MapPin,
  BarChart3,
  HelpCircle,
  Timer,
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

function Sparkline({
  data,
  height = 36,
  colorVar = "--color-chart-1",
}: {
  readonly data: readonly number[];
  readonly height?: number;
  readonly colorVar?: string;
}): ReactElement {
  const max = Math.max(...data, 1);
  const w = data.length * 10;
  const points = data
    .map((v, i) => {
      const x = i * 10 + 4;
      const y = height - Math.max(1, Math.round((v / max) * (height - 6))) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full"
      role="img"
      aria-label="Sparkline"
    >
      <polyline
        fill="none"
        stroke={`var(${colorVar})`}
        strokeWidth={2}
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface StatCardProps {
  readonly title: string;
  readonly value: string;
  readonly change?: string;
  readonly icon: LucideIcon;
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: StatCardProps): ReactElement {
  return (
    <div className="bg-card rounded-2xl border p-4 shadow-xs transition-shadow hover:shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium">{title}</p>
          <p className="text-foreground mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="bg-secondary text-secondary-foreground grid size-10 place-items-center rounded-xl">
          <Icon className="size-5" />
        </div>
      </div>
      {change ? (
        <p className="text-muted-foreground text-xs">{change}</p>
      ) : null}
    </div>
  );
}

function SimpleBarChart({
  data,
  height = 160,
  colorVar = "--color-chart-3",
}: {
  readonly data: readonly number[];
  readonly height?: number;
  readonly colorVar?: string;
}): ReactElement {
  const max = Math.max(...data, 1);
  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${data.length * 20} ${height}`}
        className="w-full"
        role="img"
        aria-label="Bar chart"
      >
        {data.map((v, i) => {
          const h = Math.max(2, Math.round((v / max) * (height - 20)));
          const x = i * 20 + 4;
          const y = height - h - 10;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={12}
                height={h}
                rx={4}
                fill={`var(${colorVar})`}
              />
            </g>
          );
        })}
        <line
          x1={0}
          y1={height - 10}
          x2={data.length * 20}
          y2={height - 10}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

function SimpleLineChart({
  data,
  height = 160,
  colorVar = "--color-chart-1",
}: {
  readonly data: readonly number[];
  readonly height?: number;
  readonly colorVar?: string;
}): ReactElement {
  const max = Math.max(...data, 1);
  const w = data.length * 24;
  const points = data
    .map((v, i) => {
      const x = i * 24 + 6;
      const y =
        height - Math.max(2, Math.round((v / max) * (height - 20))) - 10;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full"
        role="img"
        aria-label="Line chart"
      >
        <polyline
          fill="none"
          stroke={`var(${colorVar})`}
          strokeWidth={2}
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((v, i) => {
          const x = i * 24 + 6;
          const y =
            height - Math.max(2, Math.round((v / max) * (height - 20))) - 10;
          return (
            <circle key={i} cx={x} cy={y} r={3} fill={`var(${colorVar})`} />
          );
        })}
        <line
          x1={0}
          y1={height - 10}
          x2={w}
          y2={height - 10}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export default function SuperAdminPage(): ReactElement {
  const params = useParams<{ locale: "ar" | "en" }>();
  const locale: "ar" | "en" = params?.locale ?? "en";
  const filtersEnabled: boolean =
    (process.env.NEXT_PUBLIC_SA_FILTERS_ENABLED ?? "true") !== "false";
  // Filters state
  const [fromMs, setFromMs] = useState<number | undefined>(undefined);
  const [toMs, setToMs] = useState<number | undefined>(undefined);
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [regionId, setRegionId] = useState<Id<"regions"> | undefined>(
    undefined,
  );
  // i18n labels
  const t = useMemo(
    () =>
      locale === "ar"
        ? {
            header: "لوحة تحكم المشرف العام",
            subheader: "نظرة عامة وطنية للشباب والمهارات والفرص",
            from: "من",
            to: "إلى",
            gender: "الجنس",
            region: "المنطقة",
            all: "الكل",
            male: "ذكر",
            female: "أنثى",
            allRegions: "كل المناطق",
            export: "تصدير",
          }
        : {
            header: "Super Admin Dashboard",
            subheader: "National overview of youth, skills, and opportunities",
            from: "From",
            to: "To",
            gender: "Gender",
            region: "Region",
            all: "All",
            male: "Male",
            female: "Female",
            allRegions: "All Regions",
            export: "Export",
          },
    [locale],
  );

  // Handlers with Sentry spans
  function handleFromChange(value?: number): void {
    Sentry.startSpan({ op: "ui.change", name: "Filter: From" }, () => {
      setFromMs(value);
    });
  }
  function handleToChange(value?: number): void {
    Sentry.startSpan({ op: "ui.change", name: "Filter: To" }, () => {
      setToMs(value);
    });
  }
  function handleGenderChange(value: "all" | "male" | "female"): void {
    Sentry.startSpan({ op: "ui.change", name: "Filter: Gender" }, (span) => {
      span.setAttribute("gender", value);
      setGender(value);
    });
  }
  function handleRegionChange(value?: Id<"regions">): void {
    Sentry.startSpan({ op: "ui.change", name: "Filter: Region" }, (span) => {
      span.setAttribute("regionId", value ?? "all");
      setRegionId(value);
    });
  }
  // Dummy stats
  const kpis = useMemo(
    () => [
      { title: "Active Users", value: "27", change: "/ 80", icon: Activity },
      {
        title: "Questions Answered",
        value: "3,298",
        change: undefined,
        icon: HelpCircle,
      },
      {
        title: "Av. Session Length",
        value: "2m 34s",
        change: undefined,
        icon: Timer,
      },
      {
        title: "Starting Knowledge",
        value: "64%",
        change: undefined,
        icon: Users2,
      },
      {
        title: "Current Knowledge",
        value: "86%",
        change: undefined,
        icon: UserCheck,
      },
      {
        title: "Knowledge Gain",
        value: "+34%",
        change: undefined,
        icon: UserPlus,
      },
    ],
    [],
  );

  const ageDistribution = useMemo(
    () => ({
      labels: [
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28",
        "29",
      ],
      values: [
        420, 520, 680, 820, 900, 980, 1100, 1200, 1190, 1150, 980, 860, 700,
        560, 420,
      ] as const,
    }),
    [],
  );

  const activeUsersTrend = useMemo(
    () => ({
      labels: [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
      ],
      values: [120, 180, 360, 240, 280, 110, 90, 310, 330, 360, 380] as const,
    }),
    [],
  );

  const skillsByRegion = useMemo(
    () =>
      [
        { region: "Muscat", skill: "Digital Marketing", percentage: 28 },
        { region: "Dhofar", skill: "Graphic Design", percentage: 22 },
        { region: "Al Batinah", skill: "Programming", percentage: 31 },
        { region: "Al Dakhiliyah", skill: "Public Speaking", percentage: 19 },
      ] as const,
    [],
  );

  // Small sparkline data for knowledge tiles
  const knowledgeSpark1 = useMemo(
    () => [10, 12, 13, 12, 14, 15, 16, 17, 16, 18],
    [],
  );
  const knowledgeSpark2 = useMemo(
    () => [12, 13, 15, 16, 17, 19, 20, 22, 24, 26],
    [],
  );
  const knowledgeSpark3 = useMemo(
    () => [3, 4, 6, 7, 8, 12, 11, 13, 14, 16],
    [],
  );

  // Regions for filter
  const regions = useQuery(api.locations.listRegions, { locale });

  // Live data from Convex aggregates (with filters)
  const topSkills = useQuery(api.saAnalytics.topSkills, {
    locale,
    limit: 5,
    from: filtersEnabled ? fromMs : undefined,
    to: filtersEnabled ? toMs : undefined,
    gender: filtersEnabled && gender !== "all" ? gender : undefined,
    regionId: filtersEnabled ? regionId : undefined,
  });
  const topInterests = useQuery(api.saAnalytics.topInterests, {
    locale,
    limit: 5,
    from: filtersEnabled ? fromMs : undefined,
    to: filtersEnabled ? toMs : undefined,
    gender: filtersEnabled && gender !== "all" ? gender : undefined,
    regionId: filtersEnabled ? regionId : undefined,
  });
  const youthByGov = useQuery(api.saAnalytics.youthDistributionByGovernorate, {
    locale,
    from: filtersEnabled ? fromMs : undefined,
    to: filtersEnabled ? toMs : undefined,
    gender: filtersEnabled && gender !== "all" ? gender : undefined,
  });

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 flex flex-col items-start justify-between gap-3 sm:mb-8 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              {t.header}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{t.subheader}</p>
          </div>
          {filtersEnabled ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              {/* From */}
              <DateTimePicker
                label={t.from}
                valueMs={fromMs}
                onChange={handleFromChange}
              />
              {/* To */}
              <DateTimePicker
                label={t.to}
                valueMs={toMs}
                onChange={handleToChange}
              />
              {/* Gender */}
              <Select
                value={gender}
                onValueChange={(v) =>
                  handleGenderChange(v as "all" | "male" | "female")
                }
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder={t.gender} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="male">{t.male}</SelectItem>
                  <SelectItem value="female">{t.female}</SelectItem>
                </SelectContent>
              </Select>
              {/* Region */}
              <Select
                value={regionId ?? "all"}
                onValueChange={(v) =>
                  handleRegionChange(
                    v === "all" ? undefined : (v as Id<"regions">),
                  )
                }
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder={t.region} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allRegions}</SelectItem>
                  {(regions ?? []).map(
                    (r: { id: Id<"regions">; name: string }) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button className="text-xs sm:text-sm">{t.export}</Button>
            </div>
          ) : null}
        </header>

        {/* KPI Grid styled like reference (6 tiles) */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2 xl:grid-cols-6">
          {kpis.slice(0, 3).map((k) => (
            <StatCard
              key={k.title}
              title={k.title}
              value={k.value}
              change={k.change}
              icon={k.icon}
            />
          ))}
          {/* Knowledge tiles with sparklines */}
          <div className="bg-card rounded-2xl border p-4 shadow-xs sm:p-5">
            <p className="text-muted-foreground text-xs font-medium">
              Starting Knowledge
            </p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-foreground text-2xl font-bold">64%</p>
            </div>
            <div className="mt-2">
              <Sparkline data={knowledgeSpark1} />
            </div>
          </div>
          <div className="bg-card rounded-2xl border p-4 shadow-xs sm:p-5">
            <p className="text-muted-foreground text-xs font-medium">
              Current Knowledge
            </p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-foreground text-2xl font-bold">86%</p>
            </div>
            <div className="mt-2">
              <Sparkline data={knowledgeSpark2} colorVar="--color-chart-2" />
            </div>
          </div>
          <div className="bg-card rounded-2xl border p-4 shadow-xs sm:p-5">
            <p className="text-muted-foreground text-xs font-medium">
              Knowledge Gain
            </p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-foreground text-2xl font-bold">+34%</p>
            </div>
            <div className="mt-2">
              <Sparkline data={knowledgeSpark3} colorVar="--color-chart-4" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main charts */}
          <div className="space-y-6 lg:col-span-2">
            <SectionCard
              title="Activity"
              right={
                <div className="text-muted-foreground hidden text-xs sm:block">
                  Month
                </div>
              }
            >
              <div className="text-muted-foreground mb-4 flex items-center gap-2 text-xs">
                <BarChart3 className="size-4" /> Users
              </div>
              {/* Soft style bars */}
              <div className="rounded-xl border p-3">
                <SimpleBarChart
                  data={activeUsersTrend.values as unknown as number[]}
                  height={180}
                  colorVar="--color-chart-1"
                />
                <div className="text-muted-foreground mt-2 grid grid-cols-6 gap-2 text-[10px] sm:text-xs">
                  {activeUsersTrend.labels.map((l) => (
                    <span key={l} className="text-center">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Age Distribution (15–29)">
              <div className="text-muted-foreground mb-4 flex items-center gap-2 text-xs">
                <BarChart3 className="size-4" /> Bar chart
              </div>
              <SimpleBarChart
                data={ageDistribution.values as unknown as number[]}
              />
              <div className="text-muted-foreground mt-3 grid grid-cols-5 gap-2 text-[10px] sm:text-xs">
                {ageDistribution.labels.map((l) => (
                  <span key={l} className="text-center">
                    {l}
                  </span>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <SectionCard title="Applications">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-xl border p-4 shadow-xs">
                  <p className="text-foreground text-sm font-semibold">
                    Offline Workshops
                  </p>
                  <p className="text-foreground mt-2 text-2xl font-bold">213</p>
                </div>
                <div className="bg-card rounded-xl border p-4 shadow-xs">
                  <p className="text-foreground text-sm font-semibold">
                    Online Workshops
                  </p>
                  <p className="text-foreground mt-2 text-2xl font-bold">68</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Top Skills">
              <ul className="space-y-2 text-sm">
                {(topSkills ?? []).map(
                  (s: { id: string; name: string; count: number }) => (
                    <li
                      key={s.id}
                      className="hover:bg-muted flex items-center justify-between rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-muted text-muted-foreground grid size-7 place-items-center rounded-md">
                          <BarChart3 className="size-4" />
                        </div>
                        <span className="text-foreground">{s.name}</span>
                      </div>
                      <span className="text-muted-foreground">{s.count}</span>
                    </li>
                  ),
                )}
                {topSkills && topSkills.length === 0 ? (
                  <li className="text-muted-foreground px-3 py-2">No data</li>
                ) : null}
              </ul>
            </SectionCard>

            <SectionCard title="Top Interests">
              <ul className="space-y-2 text-sm">
                {(topInterests ?? []).map(
                  (i: { id: string; name: string; count: number }) => (
                    <li
                      key={i.id}
                      className="hover:bg-muted flex items-center justify-between rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-muted text-muted-foreground grid size-7 place-items-center rounded-md">
                          <BarChart3 className="size-4" />
                        </div>
                        <span className="text-foreground">{i.name}</span>
                      </div>
                      <span className="text-muted-foreground">{i.count}</span>
                    </li>
                  ),
                )}
                {topInterests && topInterests.length === 0 ? (
                  <li className="text-muted-foreground px-3 py-2">No data</li>
                ) : null}
              </ul>
            </SectionCard>
          </aside>
        </div>

        {/* Skills analytics */}
        <section className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-3">
          <SectionCard title="Skills">
            <div className="space-y-3">
              {skillsByRegion.map((r) => (
                <div
                  key={`${r.region}-${r.skill}`}
                  className="rounded-xl border p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">
                      {r.skill}
                    </span>
                    <span className="text-muted-foreground">{r.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-muted h-2 w-full rounded-full">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${r.percentage}%`,
                          background: "var(--color-chart-2)",
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground w-10 text-right text-xs">
                      {r.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Skills by Age">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                "Programming",
                "Design",
                "Marketing",
                "Public Speaking",
                "Writing",
                "Data",
              ].map((s, i) => (
                <div key={s} className="rounded-xl border p-3">
                  <p className="text-foreground mb-2 font-medium">{s}</p>
                  <SimpleBarChart
                    data={[
                      10 + i * 2,
                      14 + i * 2,
                      18 + i * 2,
                      16 + i * 2,
                      12 + i * 2,
                    ]}
                    height={80}
                    colorVar={
                      i % 2 === 0 ? "--color-chart-4" : "--color-chart-5"
                    }
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Skills Over Time">
            <SimpleLineChart
              data={[12, 14, 13, 16, 18, 20, 21, 19, 22, 24, 26, 28]}
              height={120}
            />
            <p className="text-muted-foreground mt-2 text-xs">
              Monthly share of top skill mentions across profiles
            </p>
          </SectionCard>

          <SectionCard title="Youth by Governorate">
            <ul className="space-y-2 text-sm">
              {(youthByGov ?? []).map(
                (r: { id: string; name: string; count: number }) => (
                  <li
                    key={r.id}
                    className="hover:bg-muted flex items-center justify-between rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-muted text-muted-foreground grid size-7 place-items-center rounded-md">
                        <MapPin className="size-4" />
                      </div>
                      <span className="text-foreground">{r.name}</span>
                    </div>
                    <span className="text-muted-foreground">{r.count}</span>
                  </li>
                ),
              )}
              {youthByGov && youthByGov.length === 0 ? (
                <li className="text-muted-foreground px-3 py-2">No data</li>
              ) : null}
            </ul>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
