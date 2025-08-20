"use client";

import type { ReactElement, FormEvent } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, MapPin, Save, X } from "lucide-react";

export default function AdminCreateOpportunityPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";
  const router = useRouter();

  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [status, setStatus] = useState<"Draft" | "Published">("Draft");
  const [tags, setTags] = useState<string>("");

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Dummy submit: navigate back to list
    router.push(`/${locale}/a/opportunities`);
  }

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            Create Opportunity
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Fill in the details below. All fields are dummy and not persisted.
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
                placeholder="e.g. Digital Skills Bootcamp"
              />
            </div>

            <div>
              <Label htmlFor="summary">Summary</Label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Short description of the opportunity"
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
                    placeholder="e.g. Muscat"
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
                    placeholder="e.g. Sep 10–14"
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
                    setStatus(e.target.value as "Draft" | "Published")
                  }
                  className="bg-background text-foreground mt-1 w-full rounded-md border p-2 text-sm shadow-xs focus:ring-2 focus:outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma separated (e.g. Workshop, Beginner)"
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
