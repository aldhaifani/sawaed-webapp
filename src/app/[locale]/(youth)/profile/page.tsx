"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import {
  Pen,
  Plus,
  Eye,
  Mail,
  MapPin,
  Phone,
  School,
  Shield,
  Trophy,
  User2,
  Briefcase,
  Heart,
  Layers,
  FolderGit2,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  Send,
} from "lucide-react";
import BasicDropdown from "@/components/ui/BasicDropdown";

type TabKey =
  | "identity"
  | "education"
  | "skills"
  | "interests"
  | "experience"
  | "projects"
  | "awards"
  | "activities";

interface FieldItem {
  readonly label: string;
  readonly value: string;
}

interface EducationItem {
  readonly institution: string;
  readonly degree: string;
  readonly field: string;
  readonly start: string; // e.g., 2021
  readonly end: string; // e.g., 2025 or "Present"
  readonly description?: string;
}

function TabButton({
  isActive,
  onClick,
  icon: Icon,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-secondary text-foreground border-border"
          : "bg-background text-muted-foreground hover:bg-muted border-transparent"
      }`}
      aria-pressed={isActive}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}

function InfoGrid({ items }: { items: readonly FieldItem[] }): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <div key={f.label} className="bg-background rounded-md border p-4">
          <div className="text-muted-foreground text-xs">{f.label}</div>
          <div className="text-foreground mt-1 text-sm font-medium">
            {f.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  actionLabel,
  children,
}: {
  title: string;
  actionLabel?: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <section className="bg-card rounded-xl border shadow-sm">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        {actionLabel ? (
          <button
            type="button"
            className="bg-background text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium"
          >
            {actionLabel === "Add" ? (
              <Plus className="size-3" />
            ) : actionLabel === "Edit" ? (
              <Pen className="size-3" />
            ) : null}
            {actionLabel}
          </button>
        ) : null}
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

export default function YouthProfilePage(): ReactElement {
  const [tab, setTab] = useState<TabKey>("identity");

  const tabs = useMemo(
    () =>
      [
        { key: "identity", label: "Core Identity", icon: User2 },
        { key: "education", label: "Education", icon: School },
        { key: "skills", label: "Skills & Talents", icon: Layers },
        { key: "interests", label: "Interests & Hobbies", icon: Heart },
        { key: "experience", label: "Work & Volunteering", icon: Briefcase },
        { key: "projects", label: "Projects", icon: FolderGit2 },
        { key: "awards", label: "Awards & Certificates", icon: Trophy },
        { key: "activities", label: "Activities", icon: Shield },
      ] as const,
    [],
  );

  // Matches schema: appUsers + profiles
  const identity: readonly FieldItem[] = [
    { label: "First Name", value: "Ahmed" },
    { label: "Last Name", value: "Al-Harthy" },
    { label: "Email", value: "ahmed.alharthy@example.com" },
    { label: "Phone", value: "+968 9123 4567" },
    { label: "City", value: "Muscat" },
    { label: "Region", value: "Muscat Governorate" },
    { label: "Headline", value: "Omani Student & Volunteer" },
    { label: "Gender", value: "Male" },
    { label: "Completion", value: "82%" },
  ] as const;

  const educationItems: readonly EducationItem[] = [
    {
      institution: "Al Khoud Secondary School",
      degree: "High School Diploma",
      field: "Science Track",
      start: "2021",
      end: "2024",
      description: "Robotics team captain, community service club, GPA 3.8.",
    },
    {
      institution: "Sultan Qaboos University",
      degree: "BSc (Planned)",
      field: "Computer Engineering",
      start: "2024",
      end: "2028",
      description: "Interest in smart cities, IoT, and civic technology.",
    },
  ] as const;

  const skills = [
    "Arabic (Native)",
    "English",
    "JavaScript",
    "Python",
    "Teamwork",
    "Leadership",
  ] as const;

  const interests = ["Football", "Hiking", "Photography", "Reading"] as const;

  const experiences = [
    {
      title: "Event Volunteer",
      org: "Oman Charitable Organization",
      period: "2024 · 3 mo",
      detail: "Supported donation drives and youth activities in Muscat.",
    },
    {
      title: "Web Development Intern",
      org: "ICT Oman",
      period: "2025 · 6 wk",
      detail: "Built an internal dashboard prototype using React.",
    },
  ] as const;

  const projects = [
    {
      title: "Wadi Trails Finder",
      period: "2024",
      detail: "Simple web app to discover safe hiking trails around Oman.",
    },
    {
      title: "Dates Farm Inventory",
      period: "2023",
      detail:
        "Spreadsheet + script to track harvest and sales for a family farm.",
    },
  ] as const;

  const awards = [
    {
      title: "Sultanate Science Fair – Finalist",
      issuer: "Ministry of Education",
      year: "2024",
    },
    {
      title: "Volunteer Recognition",
      issuer: "Muscat Municipality",
      year: "2023",
    },
  ] as const;

  // Matches schema: eventRegistrations.status in [pending, accepted, rejected, cancelled, waitlisted]
  const activities = [
    {
      title: "Summer Coding Camp – Muscat",
      status: "accepted",
      icon: CheckCircle2,
      tone: "text-green-700 bg-green-100",
    },
    {
      title: "Robotics Internship – Knowledge Oasis Muscat",
      status: "pending",
      icon: Clock,
      tone: "text-amber-700 bg-amber-100",
    },
    {
      title: "Design Workshop – Innovation Park Muscat",
      status: "rejected",
      icon: XCircle,
      tone: "text-red-700 bg-red-100",
    },
    {
      title: "Community Service Day – Muttrah",
      status: "cancelled",
      icon: Archive,
      tone: "text-muted-foreground bg-muted",
    },
    {
      title: "Youth Leadership – National Youth Program",
      status: "waitlisted",
      icon: Send,
      tone: "text-blue-700 bg-blue-100",
    },
  ] as const;

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="text-foreground mb-4 text-3xl font-bold sm:text-4xl">
          Profile
        </h1>

        {/* Header Card */}
        <section className="bg-card mb-6 overflow-hidden rounded-2xl border shadow-sm">
          <div className="bg-muted h-28 w-full sm:h-32" />
          <div className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-6">
            <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
              <div className="border-card bg-muted relative size-20 shrink-0 rounded-full border-4 sm:size-24">
                {/* Collaboration status badge */}
                <span className="py-0.3 text-[15px]/(0) font-h absolute -right-1 -bottom-1 rounded-full border bg-green-100 px-1 font-medium text-green-700 shadow-sm">
                  🤝
                </span>
              </div>
              <div>
                <h2 className="text-foreground text-xl font-semibold sm:text-2xl">
                  Ahmed Al-Harthy
                </h2>
                <p className="text-muted-foreground text-sm">Omani Student</p>
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Mail className="size-3" /> ahmed.alharthy@example.com
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Phone className="size-3" /> +968 9123 4567
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs">
                    <MapPin className="size-3" /> Muscat
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                className="bg-background text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
              >
                <Pen className="size-4" /> Edit
              </button>
            </div>
          </div>
        </section>

        {/* Responsive layout: sidebar on md+, horizontal tabs on mobile */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          {/* Mobile dropdown tabs */}
          <div className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 -mx-4 border-y px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:hidden">
            <BasicDropdown
              key={tab}
              className="w-full"
              label={tabs.find((t) => t.key === tab)?.label ?? tabs[0].label}
              items={tabs.map((t) => ({
                id: t.key,
                label: t.label,
                icon: <t.icon className="h-4 w-4" />,
              }))}
              onChange={(item) => setTab(item.id as TabKey)}
            />
          </div>

          {/* Desktop sidebar vertical tabs */}
          <aside className="hidden md:block">
            <div className="bg-card sticky top-6 rounded-xl border p-3 shadow-sm">
              <nav className="flex flex-col gap-2">
                {tabs.map((t) => (
                  <TabButton
                    key={t.key}
                    label={t.label}
                    icon={t.icon}
                    isActive={tab === (t.key as TabKey)}
                    onClick={() => setTab(t.key as TabKey)}
                  />
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-6">
            {tab === "identity" && (
              <SectionCard title="Profile Information" actionLabel="Edit">
                <InfoGrid items={identity} />
              </SectionCard>
            )}

            {tab === "education" && (
              <SectionCard title="Education" actionLabel="Add">
                <ul className="space-y-3">
                  {educationItems.map((e) => (
                    <li
                      key={`${e.institution}-${e.start}`}
                      className="bg-background rounded-md border p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-sm font-semibold">
                            {e.institution}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {e.degree} · {e.field}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground text-xs">
                            {e.start} – {e.end}
                          </div>
                          <button
                            type="button"
                            className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                          >
                            <Pen className="size-3" /> Edit
                          </button>
                        </div>
                      </div>
                      {e.description ? (
                        <p className="text-foreground/80 mt-2 text-sm">
                          {e.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {tab === "skills" && (
              <SectionCard title="Skills & Talents" actionLabel="Edit">
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="bg-background text-foreground rounded-full border px-3 py-1 text-sm"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {tab === "interests" && (
              <SectionCard title="Interests & Hobbies" actionLabel="Edit">
                <div className="flex flex-wrap gap-2">
                  {interests.map((s) => (
                    <span
                      key={s}
                      className="bg-background text-foreground rounded-full border px-3 py-1 text-sm"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {tab === "experience" && (
              <SectionCard title="Work & Volunteering" actionLabel="Add">
                <ul className="space-y-3">
                  {experiences.map((e) => (
                    <li
                      key={e.title}
                      className="bg-background rounded-md border p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-foreground text-sm font-semibold">
                            {e.title}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {e.org}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground text-xs">
                            {e.period}
                          </div>
                          <button
                            type="button"
                            className="bg-muted text-foreground rounded-md border px-2 py-1 text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <p className="text-foreground/80 mt-2 text-sm">
                        {e.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {tab === "projects" && (
              <SectionCard title="Projects" actionLabel="Add">
                <ul className="space-y-3">
                  {projects.map((p) => (
                    <li
                      key={p.title}
                      className="bg-background rounded-md border p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <p className="text-foreground text-sm font-semibold">
                          {p.title}
                        </p>
                        <span className="text-muted-foreground flex items-center gap-2 text-xs">
                          {p.period}
                          <button
                            type="button"
                            className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                          >
                            <Pen className="size-3" /> Edit
                          </button>
                        </span>
                      </div>
                      <p className="text-foreground/80 mt-2 text-sm">
                        {p.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {tab === "awards" && (
              <SectionCard title="Awards & Certificates" actionLabel="Add">
                <ul className="space-y-3">
                  {awards.map((a) => (
                    <li
                      key={a.title}
                      className="bg-background rounded-md border p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-foreground text-sm font-semibold">
                            {a.title}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {a.issuer}
                          </p>
                        </div>
                        <span className="text-muted-foreground flex items-center gap-2 text-xs">
                          {a.year}
                          <button
                            type="button"
                            className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                          >
                            <Pen className="size-3" /> Edit
                          </button>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {tab === "activities" && (
              <SectionCard title="Activities (Opportunity Applications)">
                <ul className="space-y-3">
                  {activities.map((a) => (
                    <li
                      key={a.title}
                      className="bg-background flex items-center justify-between gap-3 rounded-md border p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm font-semibold">
                          {a.title}
                        </p>
                        <div
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${a.tone}`}
                        >
                          <a.icon className="size-3" />
                          <span>{a.status}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"
                      >
                        <Eye className="size-3" /> View
                      </button>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
