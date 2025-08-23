"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Share2,
  Users,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

function dateRangeText(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

export default function OpportunityDetailsPage(): ReactElement {
  const params = useParams<{ id: string; locale: string }>();
  const id: string = params?.id ?? "";
  const locale: string = params?.locale ?? "ar";
  const t = useTranslations("opportunities.youthDetails");
  const isRtl: boolean = locale === "ar";
  const BackIcon: typeof ArrowLeft = isRtl ? ArrowRight : ArrowLeft;
  const event = useQuery(
    api.events.getPublicEventById,
    id
      ? { id: id as unknown as Id<"events">, locale: locale as "ar" | "en" }
      : "skip",
  );
  const myRegistration = useQuery(
    api.eventRegistrations.getMyRegistrationForEvent,
    id ? { eventId: id as unknown as Id<"events"> } : "skip",
  );
  const applyToEvent = useMutation(api.eventRegistrations.applyToEvent);
  const cancelMyRegistration = useMutation(
    api.eventRegistrations.cancelMyRegistration,
  );
  const item = useMemo(() => {
    if (!event) return undefined;
    const title = (locale === "ar" ? event.titleAr : event.titleEn) ?? "";
    const desc =
      (locale === "ar" ? event.descriptionAr : event.descriptionEn) ?? "";
    const start = new Date(event.startingDate).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const end = new Date(event.endingDate).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return {
      id: String(event._id ?? id),
      title,
      summary: desc.slice(0, 140),
      description: desc,
      location: event.city ?? event.region ?? "",
      startDate: start,
      endDate: end,
      tags: [] as string[],
      capacity: event.capacity ?? 0,
      appliedCount: 0,
    } as const;
  }, [event, id, locale]);

  const [showApply, setShowApply] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isApplied: boolean = useMemo(() => {
    if (!myRegistration) return false;
    return ["pending", "accepted", "waitlisted"].includes(
      myRegistration.status as string,
    );
  }, [myRegistration]);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showRevoke, setShowRevoke] = useState<boolean>(false);

  if (!item) {
    return (
      <main className="bg-background min-h-screen w-full">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="bg-card rounded-xl border p-8 text-center shadow-sm">
            <Clock className="text-muted-foreground mx-auto mb-2 size-6" />
            <p className="text-foreground font-medium">{t("notFoundTitle")}</p>
            <p className="text-muted-foreground text-sm">{t("notFoundHint")}</p>
            <Button asChild className="mt-4">
              <Link href={`/${locale}/opportunities`}>
                <BackIcon className="me-2 size-4" /> {t("backToList")}
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const borderTone = "border-primary";
  const capacityText: string =
    item.capacity && item.capacity > 0 ? String(item.capacity) : t("notSet");
  const now = Date.now();
  const isWithinWindow: boolean = (() => {
    if (!event) return false;
    const open =
      typeof event.registrationsOpenDate === "number"
        ? event.registrationsOpenDate
        : undefined;
    const close =
      typeof event.registrationsCloseDate === "number"
        ? event.registrationsCloseDate
        : undefined;
    if (open !== undefined && now < open) return false;
    if (close !== undefined && now > close) return false;
    return true;
  })();

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {/* Breadcrumb / Back */}
        <div className="mb-4 flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${locale}/opportunities`}>
              <BackIcon className="me-2 size-4" /> {t("back")}
            </Link>
          </Button>
          <span className="text-muted-foreground text-xs">{t("details")}</span>
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
                {/* No badge for public item currently */}
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
                {/* Source hidden for public */}
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
                    <BookmarkCheck className="me-2 size-4" /> {t("saved")}
                  </>
                ) : (
                  <>
                    <Bookmark className="me-2 size-4" /> {t("save")}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigator?.share?.({ title: item.title })}
              >
                <Share2 className="me-2 size-4" /> {t("share")}
              </Button>
              {isApplied ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowRevoke(true)}
                >
                  {t("revokeApplication")}
                </Button>
              ) : (
                <Button
                  className="bg-primary text-primary-foreground hover:opacity-95"
                  disabled={!isWithinWindow}
                  onClick={() => {
                    setActionError(null);
                    setShowApply(true);
                  }}
                >
                  {t("applyNow")}
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
                <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
                <TabsTrigger value="timeline">{t("tabs.timeline")}</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  <p>{item.description}</p>
                </article>
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <div className="bg-card rounded-xl border p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="text-muted-foreground size-5" />
                    <div>
                      <p className="text-sm font-medium">{t("eventDates")}</p>
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
                  <span className="font-medium">
                    {t("appliedCount", { count: item.appliedCount })}
                  </span>{" "}
                  · {t("capacity")} {capacityText}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background rounded-lg border p-3">
                  <div className="text-muted-foreground">{t("status")}</div>
                  <div className="font-medium">
                    {isApplied ? t("statusApplied") : t("statusNotApplied")}
                  </div>
                </div>
                <div className="bg-background rounded-lg border p-3">
                  <div className="text-muted-foreground">{t("start")}</div>
                  <div className="font-medium">{item.startDate}</div>
                </div>
                <div className="bg-background rounded-lg border p-3">
                  <div className="text-muted-foreground">{t("end")}</div>
                  <div className="font-medium">{item.endDate}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {event?.externalRegistrationUrl ? (
                  <Button variant="outline" asChild>
                    <a
                      href={event.externalRegistrationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("officialPage")}{" "}
                      <ExternalLink className="ms-2 size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div
              className={`rounded-xl border ${borderTone} bg-card border-s-4 p-4 shadow-sm`}
            >
              <p className="text-sm font-medium">{t("takeActionTitle")}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t("takeActionHint")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsSaved((v) => !v)}>
                  {isSaved ? t("saved") : t("save")}
                </Button>
                {isApplied ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowRevoke(true)}
                  >
                    {t("revoke")}
                  </Button>
                ) : (
                  <Button
                    className="bg-primary text-primary-foreground hover:opacity-95"
                    disabled={!isWithinWindow}
                    onClick={() => {
                      setActionError(null);
                      setShowApply(true);
                    }}
                  >
                    {t("apply")}
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>

      {/* Apply Dialog */}
      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("applyConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("applyConfirmHint")}
          </p>
          {actionError ? (
            <p className="text-destructive mt-2 text-sm">
              {t(`errors.${actionError}` as unknown as never)}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApply(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={async () => {
                if (!id) return;
                try {
                  setActionError(null);
                  await applyToEvent({
                    eventId: id as unknown as Id<"events">,
                  });
                  setShowApply(false);
                } catch (e: unknown) {
                  const msg = (e as Error)?.message || "UNKNOWN";
                  setActionError(msg);
                }
              }}
            >
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={showRevoke} onOpenChange={setShowRevoke}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("revokeConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("revokeConfirmHint")}
          </p>
          {actionError ? (
            <p className="text-destructive mt-2 text-sm">
              {t(`errors.${actionError}` as unknown as never)}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevoke(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!id) return;
                try {
                  setActionError(null);
                  await cancelMyRegistration({
                    eventId: id as unknown as Id<"events">,
                  });
                  setShowRevoke(false);
                } catch (e: unknown) {
                  const msg = (e as Error)?.message || "UNKNOWN";
                  setActionError(msg);
                }
              }}
            >
              {t("revoke")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
