"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Share2,
  ShieldCheck,
  Users,
  Building2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types
interface OpportunityDetails {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly location: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly source: "youth-center" | "general-directorate" | "ministry";
  readonly badge?: "NEW" | "UPCOMING" | "CLOSING SOON";
  readonly tags: readonly string[];
  readonly organization: {
    readonly name: string;
    readonly about: string;
  };
  readonly requirements: readonly string[];
  readonly benefits: readonly string[];
  readonly capacity: number;
  readonly appliedCount: number;
}

function sourceLabel(src: OpportunityDetails["source"]): string {
  if (src === "youth-center") return "Youth Center";
  if (src === "general-directorate") return "General Directorate of Youth";
  return "Ministry";
}

function dateRangeText(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

export default function OpportunityDetailsPage(): ReactElement {
  const params = useParams<{ id: string; locale: string }>();
  const id: string = params?.id ?? "";
  const locale: string = params?.locale ?? "ar";

  // Dummy dataset
  const data: readonly OpportunityDetails[] = useMemo(
    () => [
      {
        id: "1",
        title: "Digital Skills Bootcamp",
        summary:
          "Intensive 5-day program covering web fundamentals, teamwork, and presentation skills.",
        description:
          "Level up your digital skills in a focused bootcamp. You will build mini-projects, practice collaboration, and present your work. Mentors will guide you through HTML/CSS/JS basics and modern teamwork methods.",
        location: "Muscat",
        startDate: "Sep 10",
        endDate: "Sep 14",
        source: "youth-center",
        badge: "NEW",
        tags: ["Workshop", "Beginner"],
        organization: {
          name: "Muscat Youth Center",
          about:
            "A community hub empowering youth through programs in technology, arts, and leadership.",
        },
        requirements: [
          "Ages 15–24",
          "Basic computer literacy",
          "Motivation to learn and collaborate",
        ],
        benefits: [
          "Certificate of completion",
          "Mentorship and feedback",
          "Snacks and learning materials included",
        ],
        capacity: 60,
        appliedCount: 32,
      },
      {
        id: "2",
        title: "National Youth Innovation Challenge",
        summary:
          "Submit a solution to a real civic challenge. Selected teams receive mentoring and grants.",
        description:
          "A nationwide challenge for creative youth to propose solutions for civic impact. Teams will receive mentorship and potential grants to bring ideas to life.",
        location: "Nationwide",
        startDate: "Oct 1",
        endDate: "Nov 30",
        source: "general-directorate",
        tags: ["Competition", "Team"],
        organization: {
          name: "General Directorate of Youth",
          about:
            "Leads national youth programs, competitions, and talent development initiatives.",
        },
        requirements: ["Team of 3–5", "Original idea", "Pitch deck"],
        benefits: ["Mentorship", "Grant opportunities", "Showcase event"],
        capacity: 120,
        appliedCount: 85,
      },
      {
        id: "3",
        title: "Community Volunteering Day",
        summary:
          "Join a city-wide cleanup and community service day to support local neighborhoods.",
        description:
          "Spend a day giving back. Teams will be assigned to local neighborhoods to support cleanup and small community projects.",
        location: "Salalah",
        startDate: "Aug 26",
        endDate: "Aug 26",
        source: "ministry",
        badge: "UPCOMING",
        tags: ["Volunteering"],
        organization: {
          name: "Ministry of Culture, Sports and Youth",
          about:
            "Promotes youth engagement and cultural programs across the Sultanate.",
        },
        requirements: ["Ages 16+", "Comfortable shoes", "Water bottle"],
        benefits: ["Community service hours", "T-shirt", "Snacks"],
        capacity: 300,
        appliedCount: 210,
      },
    ],
    [],
  );

  const item: OpportunityDetails | undefined = useMemo(
    () => data.find((d) => d.id === id) ?? data[0],
    [data, id],
  );

  const [isApplied, setIsApplied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showRevoke, setShowRevoke] = useState<boolean>(false);

  if (!item) {
    return (
      <main className="bg-background min-h-screen w-full">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="bg-card rounded-xl border p-8 text-center shadow-sm">
            <Clock className="text-muted-foreground mx-auto mb-2 size-6" />
            <p className="text-foreground font-medium">Opportunity not found</p>
            <p className="text-muted-foreground text-sm">
              It may have been moved or removed.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/${locale}/opportunities`}>
                <ArrowLeft className="me-2 size-4" /> Back to Opportunities
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const borderTone: string =
    item.source === "youth-center"
      ? "border-primary"
      : item.source === "general-directorate"
        ? "border-secondary"
        : "border-accent";

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {/* Breadcrumb / Back */}
        <div className="mb-4 flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${locale}/opportunities`}>
              <ArrowLeft className="me-2 size-4" /> Back
            </Link>
          </Button>
          <span className="text-muted-foreground text-xs">
            Opportunity Details
          </span>
        </div>

        {/* Header */}
        <section
          className={`rounded-xl border ${borderTone} bg-card border-s-4 p-5 shadow-sm`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <div className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-lg border">
                  <Building2 className="size-5" />
                </div>
                <h1
                  className="truncate text-xl font-bold sm:text-2xl"
                  title={item.title}
                >
                  {item.title}
                </h1>
                {item.badge ? (
                  <Badge
                    className={
                      item.badge === "NEW"
                        ? "bg-primary text-primary-foreground"
                        : item.badge === "UPCOMING"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-destructive text-destructive-foreground"
                    }
                  >
                    {item.badge}
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {item.summary}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-background inline-flex items-center rounded-md border px-2.5 py-1">
                  <CalendarDays className="me-1 size-3" />{" "}
                  {dateRangeText(item.startDate, item.endDate)}
                </span>
                <span className="bg-background inline-flex items-center rounded-md border px-2.5 py-1">
                  <MapPin className="me-1 size-3" /> {item.location}
                </span>
                <span className="bg-background inline-flex items-center rounded-md border px-2.5 py-1">
                  <Star className="me-1 size-3" /> {sourceLabel(item.source)}
                </span>
                {item.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-background inline-flex items-center rounded-full border px-2.5 py-1"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" onClick={() => setIsSaved((v) => !v)}>
                {isSaved ? (
                  <>
                    <BookmarkCheck className="me-2 size-4" /> Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="me-2 size-4" /> Save
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigator?.share?.({ title: item.title })}
              >
                <Share2 className="me-2 size-4" /> Share
              </Button>
              {isApplied ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowRevoke(true)}
                >
                  Revoke Application
                </Button>
              ) : (
                <Button
                  className="bg-primary text-primary-foreground hover:opacity-95"
                  onClick={() => setIsApplied(true)}
                >
                  Apply Now
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="bg-card">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="organization">Organization</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  <p>{item.description}</p>
                  <ul>
                    {item.benefits.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </article>
              </TabsContent>
              <TabsContent value="requirements" className="mt-4">
                <ul className="grid gap-2">
                  {item.requirements.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <ShieldCheck className="text-primary mt-0.5 size-4" />
                      <span className="text-sm">{r}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
              <TabsContent value="organization" className="mt-4">
                <div className="bg-card rounded-xl border p-4 shadow-sm">
                  <h3 className="text-base font-semibold">
                    {item.organization.name}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {item.organization.about}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <div className="bg-card rounded-xl border p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="text-muted-foreground size-5" />
                    <div>
                      <p className="text-sm font-medium">Event Dates</p>
                      <p className="text-muted-foreground text-xs">
                        {dateRangeText(item.startDate, item.endDate)} ·{" "}
                        {item.location}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm">
                <Users className="text-muted-foreground size-4" />
                <span>
                  <span className="font-medium">{item.appliedCount}</span>{" "}
                  applied · Capacity {item.capacity}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background rounded-lg border p-3">
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">
                    {isApplied ? "Applied" : "Not Applied"}
                  </div>
                </div>
                <div className="bg-background rounded-lg border p-3">
                  <div className="text-muted-foreground">Source</div>
                  <div className="font-medium">{sourceLabel(item.source)}</div>
                </div>
                <div className="bg-background rounded-lg border p-3">
                  <div className="text-muted-foreground">Start</div>
                  <div className="font-medium">{item.startDate}</div>
                </div>
                <div className="bg-background rounded-lg border p-3">
                  <div className="text-muted-foreground">End</div>
                  <div className="font-medium">{item.endDate}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" asChild>
                  <a href="#" target="_blank" rel="noreferrer">
                    Official Page <ExternalLink className="ms-2 size-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div
              className={`rounded-xl border ${borderTone} bg-card border-s-4 p-4 shadow-sm`}
            >
              <p className="text-sm font-medium">Take Action</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Apply, save, or share this opportunity.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsSaved((v) => !v)}>
                  {isSaved ? "Saved" : "Save"}
                </Button>
                {isApplied ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowRevoke(true)}
                  >
                    Revoke
                  </Button>
                ) : (
                  <Button
                    className="bg-primary text-primary-foreground hover:opacity-95"
                    onClick={() => setIsApplied(true)}
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>

      {/* Revoke Dialog */}
      <Dialog open={showRevoke} onOpenChange={setShowRevoke}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke your application?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            You can apply again later while the application window is open.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevoke(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsApplied(false);
                setShowRevoke(false);
              }}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
