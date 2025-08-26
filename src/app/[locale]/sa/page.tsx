"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Label,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Users2,
  UserCheck,
  Activity,
  MapPin,
  HelpCircle,
  Timer,
  TrendingUp,
  Target,
  Award,
  Globe,
  Calendar,
} from "lucide-react";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";

export default function SuperAdminPage(): ReactElement {
  const params = useParams<{ locale: "ar" | "en" }>();
  const locale: "ar" | "en" = params?.locale ?? "en";
  // Use i18n translations
  const t = useTranslations("dashboard.superAdmin");
  const calendarT = useTranslations("calendar");

  // Month formatter function
  const formatMonth = (value: string) => {
    const monthIndex = new Date(`${value} 1, 2024`).getMonth();
    return calendarT(`shortMonths.${monthIndex}`);
  };
  // Real data from Convex queries
  const realKPIs = useQuery(api.superAdminAnalytics.getSuperAdminKPIs);
  const userRegistrationTrends = useQuery(
    api.superAdminAnalytics.getUserRegistrationTrends,
    {},
  );
  const genderDistribution = useQuery(
    api.superAdminAnalytics.getGenderDistribution,
  );
  const eventParticipationTrends = useQuery(
    api.superAdminAnalytics.getEventParticipationTrends,
    {},
  );

  // Chart configuration for consistent colors with i18n
  const chartConfig = {
    users: {
      label: t("charts.users"),
      color: "var(--chart-1)",
    },
    count: {
      label: t("charts.count"),
      color: "var(--chart-2)",
    },
    skills: {
      label: t("charts.topSkills"),
      color: "var(--chart-3)",
    },
    participants: {
      label: t("charts.participants"),
      color: "var(--chart-4)",
    },
    male: {
      label: t("charts.male"),
      color: "var(--chart-1)",
    },
    female: {
      label: t("charts.female"),
      color: "var(--chart-2)",
    },
  };

  const kpis = useMemo(
    () => [
      {
        title: t("kpis.activeYouths"),
        value: realKPIs?.totalActiveUsers?.toString() ?? "0",
        change: undefined,
        icon: Activity,
      },
      {
        title: t("kpis.totalEvents"),
        value: realKPIs?.totalEvents?.toString() ?? "0",
        change: undefined,
        icon: HelpCircle,
      },
      {
        title: t("kpis.totalRegistrations"),
        value: realKPIs?.totalRegistrations?.toString() ?? "0",
        change: undefined,
        icon: Timer,
      },
      {
        title: t("kpis.totalAdmins"),
        value: realKPIs?.totalAdmins?.toString() ?? "0",
        change: undefined,
        icon: UserCheck,
      },
    ],
    [realKPIs, t],
  );

  // Transform gender distribution into age groups with only 15-18 populated
  const ageByGenderData = useMemo(() => {
    // Defaults if no data is available
    const base = [
      { label: "15-18", male: 0, female: 0 },
      { label: "19-22", male: 0, female: 0 },
      { label: "23-26", male: 0, female: 0 },
      { label: "27-29", male: 0, female: 0 },
    ];

    if (!genderDistribution || genderDistribution.length === 0) {
      return base;
    }

    // Try to detect male/female entries robustly (supports EN/AR)
    const isMale = (s: string) => {
      const v = s.toLowerCase();
      return v.includes("male") || v.includes("ذكر");
    };
    const isFemale = (s: string) => {
      const v = s.toLowerCase();
      return v.includes("female") || v.includes("أنثى") || v.includes("انثى");
    };

    const maleEntry = genderDistribution.find((g) =>
      typeof g.name === "string" ? isMale(g.name) : false,
    );
    const femaleEntry = genderDistribution.find((g) =>
      typeof g.name === "string" ? isFemale(g.name) : false,
    );

    // If names aren't recognized, fall back to first two values
    const male = maleEntry?.value ?? genderDistribution?.[0]?.value ?? 0;
    const female = femaleEntry?.value ?? genderDistribution?.[1]?.value ?? 0;

    return [
      { label: "15-18", male, female },
      { label: "19-22", male: 0, female: 0 },
      { label: "23-26", male: 0, female: 0 },
      { label: "27-29", male: 0, female: 0 },
    ];
  }, [genderDistribution]);

  // Live data from Convex (using simple queries as fallback)
  const topSkills = useQuery(api.superAdminAnalytics.getTopSkillsSimple, {
    locale,
    limit: 5,
  });
  const topInterests = useQuery(api.superAdminAnalytics.getTopInterestsSimple, {
    locale,
    limit: 5,
  });
  const youthByGov = useQuery(
    api.superAdminAnalytics.getYouthByGovernorateSimple,
    {
      locale,
      limit: 8,
    },
  );

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              {t("subtitle")}
            </p>
          </div>
        </header>

        {/* KPI Overview Cards */}
        <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.title} className="relative overflow-hidden p-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">
                      {kpi.title}
                    </p>
                    <p className="text-foreground text-3xl font-bold">
                      {kpi.value}
                    </p>
                    {kpi.change && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="size-3 text-green-600" />
                        <span className="text-xs text-green-600">
                          {kpi.change}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="bg-primary/10 rounded-full p-3">
                    <kpi.icon className="text-primary size-6" />
                  </div>
                </div>
                <div className="from-primary/20 to-primary/5 absolute right-0 bottom-0 left-0 h-1 bg-gradient-to-r" />
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Primary Charts - Takes 2 columns on large screens */}
          <div className="space-y-8 lg:col-span-2">
            {/* User Growth & Demographics */}

            {/* User Registration Trends - Linear Area Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="size-5" />
                  {t("charts.userRegistrationTrends")}
                </CardTitle>
                <CardDescription>
                  {t("charts.userRegistrationTrendsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <AreaChart
                    accessibilityLayer
                    data={userRegistrationTrends ?? []}
                    margin={{
                      left: locale === "ar" ? 12 : 12,
                      right: locale === "ar" ? 12 : 12,
                    }}
                    style={{
                      direction: locale === "ar" ? "rtl" : "ltr",
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={formatMonth}
                      padding={{ left: 0, right: 0 }}
                      scale="point"
                      reversed={locale === "ar"}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={22}
                      orientation={locale === "ar" ? "right" : "left"}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          hideLabel
                          formatter={(value, _name) => {
                            const textValue =
                              typeof value === "number"
                                ? value.toString()
                                : String(value ?? "");
                            return [
                              `${textValue} ${t("charts.users")}`,
                              t("charts.userRegistrationTrends"),
                            ];
                          }}
                        />
                      }
                    />
                    <Area
                      dataKey="users"
                      type="linear"
                      fill="var(--color-users)"
                      fillOpacity={0.4}
                      stroke="var(--color-users)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter>
                <div className="flex w-full items-start gap-2 text-sm">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 leading-none font-medium">
                      {t("trends.userGrowth")}{" "}
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 leading-none">
                      {t("trends.last12Months")}
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>

            {/* Age Distribution by Gender - Stacked Bar Chart (default age 15-18) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-5" />
                  {t("charts.ageDistribution")}
                </CardTitle>
                <CardDescription>
                  {t("charts.ageDistributionDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart
                    accessibilityLayer
                    data={ageByGenderData}
                    style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
                    barCategoryGap={16}
                    barGap={8}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      padding={{ left: 0, right: 0 }}
                      reversed={locale === "ar"}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={22}
                      orientation={locale === "ar" ? "right" : "left"}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="male"
                      stackId="age"
                      fill="var(--color-male)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="female"
                      stackId="age"
                      fill="var(--color-female)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Skills & Interests Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="size-5" />
                  {t("charts.skillsInterestsOverview")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-4 text-sm font-semibold">
                      {t("charts.topSkills")}
                    </h4>
                    <div className="space-y-3">
                      {(topSkills ?? []).slice(0, 5).map((skill) => (
                        <div
                          key={skill.id}
                          className="flex items-center justify-between"
                        >
                          <span className="text-foreground text-sm">
                            {skill.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {skill.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-4 text-sm font-semibold">
                      {t("charts.topInterests")}
                    </h4>
                    <div className="space-y-3">
                      {(topInterests ?? []).slice(0, 5).map((interest) => (
                        <div
                          key={interest.id}
                          className="flex items-center justify-between"
                        >
                          <span className="text-foreground text-sm">
                            {interest.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {interest.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Takes 1 column on large screens */}
          <div className="space-y-6">
            {/* Gender Distribution - Donut Chart with Text */}
            <Card className="flex flex-col">
              <CardHeader className="items-center pb-0">
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="size-5" />
                  {t("charts.genderDistribution")}
                </CardTitle>
                <CardDescription>
                  {t("charts.genderDistributionDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-h-[250px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={genderDistribution ?? []}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      {genderDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            const totalUsers =
                              genderDistribution?.reduce(
                                (acc, curr) => acc + curr.value,
                                0,
                              ) ?? 0;
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-foreground text-3xl font-bold"
                                >
                                  {totalUsers.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy ?? 0) + 24}
                                  className="fill-muted-foreground"
                                >
                                  {t("charts.totalUsers")}
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 leading-none font-medium">
                  {t("trends.genderOverview")}{" "}
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-muted-foreground leading-none">
                  {t("trends.currentDemographics")}
                </div>
              </CardFooter>
            </Card>

            {/* Youth by Governorate - Pie Chart */}
            <Card className="flex flex-col">
              <CardHeader className="items-center pb-0">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="size-5" />
                  {t("charts.youthByGovernorate")}
                </CardTitle>
                <CardDescription>
                  {t("charts.youthByGovernorateDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-h-[250px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={(youthByGov ?? []).slice(0, 6).map((region) => ({
                        name: region.name,
                        value: region.count,
                        fill: `var(--chart-${((youthByGov?.indexOf(region) ?? 0) % 5) + 1})`,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      strokeWidth={5}
                    >
                      {(youthByGov ?? []).slice(0, 6).map((region, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`var(--chart-${(index % 5) + 1})`}
                        />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            const totalUsers = (youthByGov ?? [])
                              .slice(0, 6)
                              .reduce((acc, curr) => acc + curr.count, 0);
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-foreground text-2xl font-bold"
                                >
                                  {totalUsers.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy ?? 0) + 20}
                                  className="fill-muted-foreground text-sm"
                                >
                                  {t("charts.users")}
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 leading-none font-medium">
                  {t("trends.regionalDistribution")}{" "}
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="text-muted-foreground leading-none">
                  {t("trends.top6Governorates")}
                </div>
              </CardFooter>
            </Card>

            {/* Event Participation Trends - Linear Area Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  {t("charts.eventParticipationTrends")}
                </CardTitle>
                <CardDescription>
                  {t("charts.eventParticipationTrendsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-48 w-full">
                  <AreaChart
                    accessibilityLayer
                    data={eventParticipationTrends ?? []}
                    margin={{
                      left: locale === "ar" ? 12 : 12,
                      right: locale === "ar" ? 12 : 12,
                    }}
                    style={{
                      direction: locale === "ar" ? "rtl" : "ltr",
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={formatMonth}
                      padding={{ left: 0, right: 0 }}
                      scale="point"
                      reversed={locale === "ar"}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={22}
                      orientation={locale === "ar" ? "right" : "left"}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          hideLabel
                          formatter={(value, _name) => {
                            const textValue =
                              typeof value === "number"
                                ? value.toString()
                                : String(value ?? "");
                            return [
                              `${textValue} ${t("charts.participants")}`,
                              t("charts.eventParticipationTrends"),
                            ];
                          }}
                        />
                      }
                    />
                    <Area
                      dataKey="participants"
                      type="linear"
                      fill="var(--color-participants)"
                      fillOpacity={0.4}
                      stroke="var(--color-participants)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter>
                <div className="flex w-full items-start gap-2 text-sm">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 leading-none font-medium">
                      {t("trends.participationTrends")}{" "}
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 leading-none">
                      {t("trends.last6Months")}
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
