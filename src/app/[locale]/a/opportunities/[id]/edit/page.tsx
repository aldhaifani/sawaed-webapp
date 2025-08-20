"use client";

import type { ReactElement, FormEvent } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, MapPin, Save, X } from "lucide-react";

interface AdminOpportunity {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly location: string;
  readonly date: string;
  readonly status: "Draft" | "Published" | "Archived";
  readonly tags?: string[];
}

const DUMMY: readonly AdminOpportunity[] = [
  {
    id: "op-101",
    title: "Digital Skills Bootcamp",
    summary:
      "Intensive 5-day program covering web fundamentals, teamwork, and presentation skills.",
    location: "Muscat",
    date: "Sep 10–14",
    status: "Published",
    tags: ["Workshop", "Beginner"],
  },
  {
    id: "op-102",
    title: "National Youth Innovation Challenge",
    summary:
      "Submit a solution to a real civic challenge. Mentorship and grants for winners.",
    location: "Nationwide",
    date: "Oct 1–Nov 30",
    status: "Draft",
    tags: ["Competition", "Team"],
  },
];

export default function AdminEditOpportunityPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const item = useMemo(
    () => DUMMY.find((d) => d.id === params.id),
    [params.id],
  );

  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [status, setStatus] = useState<"Draft" | "Published" | "Archived">(
    "Draft",
  );
  const [tags, setTags] = useState<string>("");

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setSummary(item.summary);
    setLocation(item.location);
    setDate(item.date);
    setStatus(item.status);
    setTags((item.tags ?? []).join(", "));
  }, [item]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Dummy save: navigate back to list
    router.push(`/${locale}/a/opportunities`);
  }

  if (!item) {
    return (
      <main className="bg-background min-h-screen w-full">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <p className="text-foreground text-lg font-semibold">
            Opportunity not found
          </p>
          <Button asChild className="mt-4">
            <Link href={`/${locale}/a/opportunities`}>Back to list</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            Edit Opportunity
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Update details for: {item.title}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl border p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-5">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="summary">Summary</Label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="bg-background text-foreground mt-1 w-full rounded-md border p-2 text-sm shadow-xs focus:ring-2 focus:outline-none"
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <CalendarDays className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "Draft" | "Published" | "Archived",
                    )
                  }
                  className="bg-background text-foreground mt-1 w-full rounded-md border p-2 text-sm shadow-xs focus:ring-2 focus:outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link
                  href={`/${locale}/a/opportunities`}
                  className="inline-flex items-center gap-1"
                >
                  <X className="size-4" /> Cancel
                </Link>
              </Button>
              <Button type="submit" className="inline-flex items-center gap-1">
                <Save className="size-4" /> Save
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
