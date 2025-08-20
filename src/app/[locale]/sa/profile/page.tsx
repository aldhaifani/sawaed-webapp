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
  Settings,
  Users,
} from "lucide-react";

export default function SuperAdminProfilePage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";

  const sa = {
    name: "Ahmed Al-Harthy",
    role: "SUPER_ADMIN" as const,
    email: "ahmed.alharthy@mcsy.gov.om",
    phone: "+968 9123 4567",
    employeeId: "MCSY-SA-0001",
    organization: "Sawaed Platform (National)",
    joined: "Mar 3, 2024",
    about:
      "Super Admin overseeing national Sawaed platform operations, data integrity, and partnerships across Oman.",
  } as const;

  const recent = [
    { id: 1, title: "Approved: 12 new ministry admins", date: "Aug 18" },
    { id: 2, title: "Updated system roles & permissions", date: "Aug 16" },
    { id: 3, title: "Published monthly platform report", date: "Aug 10" },
  ] as const;

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              Super Admin Profile
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              View your account details and recent activity.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link
                href={`/${locale}/sa/settings`}
                className="inline-flex items-center gap-2"
              >
                <Settings className="size-4" /> Settings
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link
                href={`/${locale}/sa`}
                className="inline-flex items-center gap-2"
              >
                <Users className="size-4" /> Admin Console
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
                  {sa.name}
                </h2>
                <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                  <Shield className="mr-1 size-3" /> {sa.role}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="text-muted-foreground size-4" />
                <span className="text-foreground">{sa.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="text-muted-foreground size-4" />
                <span className="text-foreground">{sa.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground inline-flex size-4 items-center justify-center">
                  #
                </span>
                <span className="text-foreground">
                  Employee ID: {sa.employeeId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="text-muted-foreground size-4" />
                <span className="text-foreground">{sa.organization}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="text-muted-foreground size-4" />
                <span className="text-foreground">Joined {sa.joined}</span>
              </div>
            </div>

            <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
              {sa.about}
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
                  <Link href={`/${locale}/sa`}>Go to Dashboard</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/sa/settings`}>Account Settings</Link>
                </Button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
