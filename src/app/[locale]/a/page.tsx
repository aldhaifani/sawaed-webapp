"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  ComposedChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
} from "recharts";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { BarChart3, CalendarDays, Layers3, Plus, Users } from "lucide-react";

type RecentActivity = {
  id: Id<"eventRegistrations">;
  name: string;
  nameEn: string;
  nameAr: string;
  action: string;
  details: string;
  eventTitleEn: string;
  eventTitleAr: string;
  timestamp: number;
};

/**
 * Admin Dashboard (role: ADMIN)
 * Focuses on opportunities metrics with minimal youth info. Dummy data only.
 */
export default function AdminPage(): ReactElement {
  const params = useParams<{ locale: "ar" | "en" }>();
  const locale: "ar" | "en" = params?.locale ?? "en";

  // Use i18n translations
  const t = useTranslations("dashboard.admin");
  const calendarT = useTranslations("calendar");

  // Month formatter function for admin dashboard
  const formatMonth = (value: string) => {
    const monthIndex = new Date(`${value} 1, 2024`).getMonth();
    return calendarT(`shortMonths.${monthIndex}`);
  };

  // Fetch real data from Convex
  const kpis = useQuery(api.adminAnalytics.getAdminKPIs, {});
  const monthlyData = useQuery(api.adminAnalytics.getMonthlyOpportunities, {});
  const recentActivity = useQuery(
    api.adminAnalytics.getRecentYouthActivity,
    {},
  );

  const stats = useMemo(
    () =>
      [
        {
          id: "total",
          label: t("kpis.totalOpportunities"),
          value: kpis?.totalOpportunities ?? 0,
          icon: Layers3,
        },
        {
          id: "open",
          label: t("kpis.openNow"),
          value: kpis?.openOpportunities ?? 0,
          icon: BarChart3,
        },
        {
          id: "upcoming",
          label: t("kpis.upcoming30d"),
          value: kpis?.upcomingOpportunities ?? 0,
          icon: CalendarDays,
        },
        {
          id: "registrations",
          label: t("kpis.registrationsWeek"),
          value: kpis?.weeklyRegistrations ?? 0,
          icon: Users,
        },
      ] as const,
    [kpis, t],
  );

  // Chart configuration for consistent colors with i18n
  const chartConfig = {
    count: {
      label: t("charts.opportunities"),
      color: "var(--chart-1)",
    },
  };

  // Build composed chart data and area shadow for count
  const composedData = useMemo(() => {
    if (!monthlyData)
      return [] as Array<{ month: string; count: number; countArea: number }>;
    const arr = monthlyData as Array<{ month: string; count: number }>;
    return arr.map((d) => ({
      month: d.month,
      count: d.count ?? 0,
      countArea: d.count ?? 0,
    }));
  }, [monthlyData]);

  const ChartLabel = ({ label, color }: { label: string; color: string }) => (
    <div className="flex items-center gap-1.5">
      <div
        className="bg-background size-3.5 rounded-full border-4"
        style={{ borderColor: color }}
      />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );

  type TooltipEntry = {
    dataKey?: string;
    color?: string;
    value?: number | string | null;
  };
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  }) => {
    if (active && (payload?.length ?? 0) > 0) {
      const filtered = (payload ?? []).filter((p) => p.dataKey !== "countArea");
      const monthLabel =
        typeof label === "string" ? formatMonth(label) : String(label ?? "");
      return (
        <div
          className="bg-popover min-w-[160px] rounded-lg border p-3 shadow-sm shadow-black/5"
          style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
        >
          <div className="text-muted-foreground mb-2.5 text-xs font-medium tracking-wide">
            {monthLabel}
          </div>
          <div className="space-y-2">
            {filtered.map((entry, idx) => {
              const cfg =
                chartConfig[entry.dataKey as keyof typeof chartConfig];
              return (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <ChartLabel
                    label={`${String(cfg?.label ?? "")}:`}
                    color={entry.color ?? chartConfig.count.color}
                  />
                  <span className="text-popover-foreground font-semibold">
                    {entry.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <header className="mb-5 flex items-start justify-between gap-3 sm:mb-8">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("subtitle")}
            </p>
          </div>
          <div className="hidden sm:block">
            <Button className="gap-2" asChild>
              <a href={`/${locale}/a/opportunities/create`}>
                <Plus className="size-4" /> {t("charts.newOpportunity")}
              </a>
            </Button>
          </div>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.id} className="p-0">
              <CardContent className="p-5">
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
                {/* decorative progress 
                <div className="bg-muted mt-4 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${35 + (i + 1) * 10}%`,
                      background: "var(--chart-1)",
                    }}
                  />
                </div>
                */}
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Charts + Right column */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            {/* Monthly published opportunities (Composed chart) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">
                  {t("charts.monthlyPublished")}
                </CardTitle>
                <Button size="sm" variant="outline" className="text-xs">
                  {t("export")}
                </Button>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <ComposedChart
                    data={composedData}
                    style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
                    margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="countGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={chartConfig.count.color}
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor={chartConfig.count.color}
                          stopOpacity={0.06}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke="var(--input)"
                      strokeOpacity={1}
                      horizontal
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        className: "text-muted-foreground",
                      }}
                      dy={5}
                      tickMargin={12}
                      tickFormatter={formatMonth}
                      scale="point"
                      allowDuplicatedCategory={false}
                      reversed={locale === "ar"}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 12,
                        className: "text-muted-foreground",
                      }}
                      tickMargin={8}
                      width={22}
                      orientation={locale === "ar" ? "right" : "left"}
                      allowDecimals={false}
                    />

                    {/* Optional reference to current month */}
                    {/* <ReferenceLine x={new Date().toLocaleString('en-US', { month: 'short', year: '2-digit' })} stroke={chartConfig.count.color} strokeWidth={1} /> */}

                    <ChartTooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "var(--input)", strokeWidth: 1 }}
                    />

                    {/* Area background for count */}
                    <Area
                      type="linear"
                      dataKey="countArea"
                      stroke="transparent"
                      fill="url(#countGradient)"
                      strokeWidth={0}
                      dot={false}
                    />

                    {/* Count line */}
                    <Line
                      type="linear"
                      dataKey="count"
                      stroke={chartConfig.count.color}
                      strokeWidth={2}
                      dot={{
                        fill: "var(--background)",
                        strokeWidth: 2,
                        r: 5,
                        stroke: chartConfig.count.color,
                      }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </section>

          {/* Right column */}
          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {t("charts.quickActions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="gap-2" asChild>
                    <a href={`/${locale}/a/opportunities/create`}>
                      <Plus className="size-4" /> {t("charts.newOpportunity")}
                    </a>
                  </Button>
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={`/${locale}/a/opportunities`}>
                      <Layers3 className="size-4" /> {t("charts.manageAll")}
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {t("charts.recentYouthActivity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentActivity && recentActivity.length > 0 ? (
                    recentActivity
                      .filter((a): a is RecentActivity => Boolean(a))
                      .map((activity: RecentActivity) => (
                        <div
                          key={activity.id}
                          className={`hover:bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2 text-sm`}
                        >
                          <span
                            className={`text-foreground truncate ${locale === "ar" ? "pl-2" : "pr-2"}`}
                          >
                            {(locale === "ar"
                              ? activity.nameAr
                              : activity.nameEn) ||
                              activity.name ||
                              t("activity.userFallback")}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {activity.action === "Registered"
                              ? t("activity.registered")
                              : t("activity.applied")}{" "}
                            {(locale === "ar"
                              ? activity.eventTitleAr
                              : activity.eventTitleEn) ||
                              activity.details ||
                              t("activity.eventFallback")}
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className="text-muted-foreground py-4 text-center">
                      {t("charts.noData")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
