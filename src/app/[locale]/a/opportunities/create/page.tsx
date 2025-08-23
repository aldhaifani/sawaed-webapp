"use client";

import type { ReactElement, FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Save, UploadCloud, X } from "lucide-react";
import { DateTimeField } from "@/components/ui/date-time-field";

export default function AdminCreateOpportunityPage(): ReactElement {
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "ar" ? "ar" : "en";
  const t = useTranslations("opportunities");
  const router = useRouter();

  // Mutations
  const createDraft = useMutation(api.events.createEventDraft);
  const publishEvent = useMutation(api.events.publishEvent);

  // Form state
  type RegistrationPolicy = "open" | "approval" | "inviteOnly";
  const [titleEn, setTitleEn] = useState<string>("");
  const [titleAr, setTitleAr] = useState<string>("");
  const [descriptionEn, setDescriptionEn] = useState<string>("");
  const [descriptionAr, setDescriptionAr] = useState<string>("");
  const [startingDate, setStartingDate] = useState<string>("");
  const [endingDate, setEndingDate] = useState<string>("");
  const [registrationsOpenDate, setRegistrationsOpenDate] =
    useState<string>("");
  const [registrationsCloseDate, setRegistrationsCloseDate] =
    useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [venueName, setVenueName] = useState<string>("");
  const [venueAddress, setVenueAddress] = useState<string>("");
  const [googleMapUrl, setGoogleMapUrl] = useState<string>("");
  const [onlineUrl, setOnlineUrl] = useState<string>("");
  const [posterUrl, setPosterUrl] = useState<string>("");
  const [registrationPolicy, setRegistrationPolicy] =
    useState<RegistrationPolicy>("open");
  const [isRegistrationRequired, setIsRegistrationRequired] =
    useState<boolean>(false);
  const [allowWaitlist, setAllowWaitlist] = useState<boolean>(false);
  const [capacity, setCapacity] = useState<string>("");
  const [externalRegistrationUrl, setExternalRegistrationUrl] =
    useState<string>("");
  const [maxRegistrationsPerUser, setMaxRegistrationsPerUser] =
    useState<string>("");
  const [termsUrl, setTermsUrl] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const toMs = useCallback((iso: string): number | undefined => {
    if (!iso) return undefined;
    const ms = new Date(iso).getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }, []);

  const toLocalInput = useCallback((ms?: number): string => {
    if (!ms) return "";
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }, []);

  const canSubmit = useMemo(() => {
    return (
      titleEn.trim() &&
      titleAr.trim() &&
      descriptionEn.trim() &&
      descriptionAr.trim() &&
      Boolean(toMs(startingDate)) &&
      Boolean(toMs(endingDate))
    );
  }, [
    titleEn,
    titleAr,
    descriptionEn,
    descriptionAr,
    startingDate,
    endingDate,
    toMs,
  ]);

  async function onSave(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await createDraft({
        titleEn,
        titleAr,
        descriptionEn,
        descriptionAr,
        startingDate: toMs(startingDate)!,
        endingDate: toMs(endingDate)!,
        registrationsOpenDate: toMs(registrationsOpenDate),
        registrationsCloseDate: toMs(registrationsCloseDate),
        region: region || undefined,
        city: city || undefined,
        venueName: venueName || undefined,
        venueAddress: venueAddress || undefined,
        googleMapUrl: googleMapUrl || undefined,
        onlineUrl: onlineUrl || undefined,
        posterUrl: posterUrl || undefined,
        registrationPolicy,
        isRegistrationRequired,
        allowWaitlist,
        capacity: capacity ? Number(capacity) : undefined,
        externalRegistrationUrl: externalRegistrationUrl || undefined,
        maxRegistrationsPerUser: maxRegistrationsPerUser
          ? Number(maxRegistrationsPerUser)
          : undefined,
        termsUrl: termsUrl || undefined,
        contact: contact || undefined,
      });
      if (res?.id) {
        router.push(`/${locale}/a/opportunities`);
      } else {
        router.push(`/${locale}/a/opportunities`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onPublishNow(): Promise<void> {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await createDraft({
        titleEn,
        titleAr,
        descriptionEn,
        descriptionAr,
        startingDate: toMs(startingDate)!,
        endingDate: toMs(endingDate)!,
        registrationsOpenDate: toMs(registrationsOpenDate),
        registrationsCloseDate: toMs(registrationsCloseDate),
        region: region || undefined,
        city: city || undefined,
        venueName: venueName || undefined,
        venueAddress: venueAddress || undefined,
        googleMapUrl: googleMapUrl || undefined,
        onlineUrl: onlineUrl || undefined,
        posterUrl: posterUrl || undefined,
        registrationPolicy,
        isRegistrationRequired,
        allowWaitlist,
        capacity: capacity ? Number(capacity) : undefined,
        externalRegistrationUrl: externalRegistrationUrl || undefined,
        maxRegistrationsPerUser: maxRegistrationsPerUser
          ? Number(maxRegistrationsPerUser)
          : undefined,
        termsUrl: termsUrl || undefined,
        contact: contact || undefined,
      });
      if (res?.id) {
        await publishEvent({ id: res.id });
      }
      router.push(`/${locale}/a/opportunities`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
            {t("createTitle")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {/* TODO: localize subtitle if needed */}
          </p>
        </header>

        <form
          onSubmit={onSave}
          className="bg-card rounded-2xl border p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="titleEn">{t("form.titleEn")}</Label>
                <Input
                  id="titleEn"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={t("placeholders.titleEn")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleAr">{t("form.titleAr")}</Label>
                <Input
                  id="titleAr"
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  placeholder={t("placeholders.titleAr")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">{t("form.descriptionEn")}</Label>
                <Textarea
                  id="descriptionEn"
                  rows={5}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionAr">{t("form.descriptionAr")}</Label>
                <Textarea
                  id="descriptionAr"
                  rows={5}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DateTimeField
                label={t("form.startsAt")}
                valueText={startingDate}
                valueMs={toMs(startingDate)}
                onChangeMs={(ms) => setStartingDate(toLocalInput(ms))}
              />
              <DateTimeField
                label={t("form.endsAt")}
                valueText={endingDate}
                valueMs={toMs(endingDate)}
                onChangeMs={(ms) => setEndingDate(toLocalInput(ms))}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DateTimeField
                label={t("form.registrationsOpen")}
                valueText={registrationsOpenDate}
                valueMs={toMs(registrationsOpenDate)}
                onChangeMs={(ms) => setRegistrationsOpenDate(toLocalInput(ms))}
              />
              <DateTimeField
                label={t("form.registrationsClose")}
                valueText={registrationsCloseDate}
                valueMs={toMs(registrationsCloseDate)}
                onChangeMs={(ms) => setRegistrationsCloseDate(toLocalInput(ms))}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="region">{t("form.region")}</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder={t("placeholders.region")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("form.city")}</Label>
                <div className="relative">
                  <MapPin className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venueName">{t("form.venueName")}</Label>
                <Input
                  id="venueName"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueAddress">{t("form.venueAddress")}</Label>
                <Input
                  id="venueAddress"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="googleMapUrl">{t("form.googleMapUrl")}</Label>
                <Input
                  id="googleMapUrl"
                  value={googleMapUrl}
                  onChange={(e) => setGoogleMapUrl(e.target.value)}
                  placeholder={t("placeholders.googleMapUrl")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onlineUrl">{t("form.onlineUrl")}</Label>
                <Input
                  id="onlineUrl"
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder={t("placeholders.onlineUrl")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="posterUrl">{t("form.posterUrl")}</Label>
                <div className="relative">
                  <UploadCloud className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="posterUrl"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder={t("placeholders.posterUrl")}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="registrationPolicy">
                  {t("form.registrationPolicy")}
                </Label>
                <select
                  id="registrationPolicy"
                  value={registrationPolicy}
                  onChange={(e) =>
                    setRegistrationPolicy(e.target.value as RegistrationPolicy)
                  }
                  className="bg-background text-foreground mt-1 w-full rounded-md border p-2 text-sm shadow-xs focus:ring-2 focus:outline-none"
                >
                  <option value="open">{t("policyOptions.open")}</option>
                  <option value="approval">
                    {t("policyOptions.approval")}
                  </option>
                  <option value="inviteOnly">
                    {t("policyOptions.inviteOnly")}
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isRegistrationRequired">
                  {t("form.isRegistrationRequired")}
                </Label>
                <select
                  id="isRegistrationRequired"
                  value={isRegistrationRequired ? "yes" : "no"}
                  onChange={(e) =>
                    setIsRegistrationRequired(e.target.value === "yes")
                  }
                  className="bg-background text-foreground mt-1 w-full rounded-md border p-2 text-sm shadow-xs focus:ring-2 focus:outline-none"
                >
                  <option value="no">{t("booleanOptions.no")}</option>
                  <option value="yes">{t("booleanOptions.yes")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowWaitlist">{t("form.allowWaitlist")}</Label>
                <select
                  id="allowWaitlist"
                  value={allowWaitlist ? "yes" : "no"}
                  onChange={(e) => setAllowWaitlist(e.target.value === "yes")}
                  className="bg-background text-foreground mt-1 w-full rounded-md border p-2 text-sm shadow-xs focus:ring-2 focus:outline-none"
                >
                  <option value="no">{t("booleanOptions.no")}</option>
                  <option value="yes">{t("booleanOptions.yes")}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="capacity">{t("form.capacity")}</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="0"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRegistrationsPerUser">
                  {t("form.maxRegistrationsPerUser")}
                </Label>
                <Input
                  id="maxRegistrationsPerUser"
                  type="number"
                  min="1"
                  value={maxRegistrationsPerUser}
                  onChange={(e) => setMaxRegistrationsPerUser(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalRegistrationUrl">
                  {t("form.externalRegistrationUrl")}
                </Label>
                <Input
                  id="externalRegistrationUrl"
                  value={externalRegistrationUrl}
                  onChange={(e) => setExternalRegistrationUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="termsUrl">{t("form.termsUrl")}</Label>
                <Input
                  id="termsUrl"
                  value={termsUrl}
                  onChange={(e) => setTermsUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">{t("form.contact")}</Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t("placeholders.contact")}
                />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link
                  href={`/${locale}/a/opportunities`}
                  className="inline-flex items-center gap-1"
                >
                  <X className="size-4" /> {t("actions.back")}
                </Link>
              </Button>
              <Button
                type="submit"
                className="inline-flex items-center gap-1"
                disabled={!canSubmit || submitting}
              >
                <Save className="size-4" /> {t("actions.saveDraft")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="inline-flex items-center gap-1"
                onClick={onPublishNow}
                disabled={!canSubmit || submitting}
              >
                <Save className="size-4" /> {t("actions.publish")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
