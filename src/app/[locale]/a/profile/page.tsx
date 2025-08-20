"use client";

import type { ReactElement } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Mail,
  Phone,
  Shield,
  Building2,
  Edit3,
  UserRound,
} from "lucide-react";

export default function AdminProfilePage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";

  const admin = {
    name: "Ahmed Al-Harthy",
    role: "ADMIN" as const,
    email: "ahmed.alharthy@mcsy.gov.om",
    phone: "+968 9123 4567",
    employeeId: "MCSY-2025-0142",
    organization: "Ministry of Culture, Sports and Youth (Oman)",
    joined: "Jan 12, 2024",
    about:
      "Administrator overseeing youth opportunities publication and review across Oman. Passionate about civic tech and community programs.",
  } as const;

  const recent = [
    { id: 1, title: "Published: Digital Skills Bootcamp", date: "Aug 18" },
    {
      id: 2,
      title: "Edited: National Youth Innovation Challenge",
      date: "Aug 16",
    },
    { id: 3, title: "Archived: Summer Coding Camp 2023", date: "Aug 10" },
  ] as const;

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              Admin Profile
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              View your account details and recent activity.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link
                href={`/${locale}/a/settings`}
                className="inline-flex items-center gap-2"
              >
                <Edit3 className="size-4" /> Edit Profile
              </Link>
            </Button>
            <Button asChild>
              <Link
                href={`/${locale}/a/opportunities/create`}
                className="inline-flex items-center gap-2"
              >
                <UserRound className="size-4" /> New Opportunity
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Profile Card */}
          <article className="bg-card rounded-2xl border p-6 shadow-sm lg:col-span-1">
            <div className="flex items-center gap-4">
              <div className="bg-background text-foreground flex size-16 items-center justify-center rounded-full border text-xl font-semibold shadow-xs">
                AA
              </div>
              <div>
                <h2 className="text-foreground text-lg font-semibold">
                  {admin.name}
                </h2>
                <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                  <Shield className="mr-1 size-3" /> {admin.role}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="text-muted-foreground size-4" />
                <span className="text-foreground">{admin.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="text-muted-foreground size-4" />
                <span className="text-foreground">{admin.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground inline-flex size-4 items-center justify-center">
                  #
                </span>
                <span className="text-foreground">
                  Employee ID: {admin.employeeId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="text-muted-foreground size-4" />
                <span className="text-foreground">{admin.organization}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="text-muted-foreground size-4" />
                <span className="text-foreground">Joined {admin.joined}</span>
              </div>
            </div>

            <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
              {admin.about}
            </p>
          </article>

          {/* Right: Activity and Quick Links */}
          <div className="space-y-6 lg:col-span-2">
            <article className="bg-card rounded-2xl border p-6 shadow-sm">
              <h3 className="text-foreground mb-4 text-base font-semibold">
                Recent Activity
              </h3>
              <ul className="divide-y">
                {recent.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between py-3"
                  >
                    <span className="text-foreground">{r.title}</span>
                    <span className="text-muted-foreground text-sm">
                      {r.date}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-card rounded-2xl border p-6 shadow-sm">
              <h3 className="text-foreground mb-4 text-base font-semibold">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <Link href={`/${locale}/a/opportunities`}>
                    Manage Opportunities
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/a/settings`}>Account Settings</Link>
                </Button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
