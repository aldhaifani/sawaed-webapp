"use client";

import type { ReactElement } from "react";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FileUpload from "@/components/ui/FileUpload";
import * as Sentry from "@sentry/nextjs";
import {
  CalendarDays,
  Mail,
  Phone,
  Shield,
  Building2,
  Plus,
  XCircle,
} from "lucide-react";

type AdminHeader = {
  readonly displayName: string;
  readonly role: string;
  readonly email: string;
  readonly phone?: string;
  readonly employeeId?: string;
  readonly organization?: string;
  readonly joinedText: string;
  readonly initials: string;
};

export default function AdminProfilePage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";
  const t = useTranslations("adminProfile");
  const tCommon = useTranslations("common");
  const me = useQuery(api.rbac.currentUser, {});
  const onboarding = useQuery(api.adminOnboarding.getMyAdminOnboarding, {});
  const profile = useQuery(api.adminProfiles.getMyAdminProfile, {});
  const stats = useQuery(api.adminProfiles.getMyAdminStats, {});
  const upsert = useMutation(api.adminProfiles.upsertMyAdminProfile);
  const genUploadUrl = useAction(
    api.adminProfiles.generateAdminAvatarUploadUrl,
  );
  const finalizeUpload = useMutation(
    api.adminProfiles.finalizeAdminAvatarUpload,
  );
  const clearAvatar = useMutation(api.adminProfiles.clearAdminAvatar);
  const capture = useAction(api.analytics.captureEvent);

  const [organizationNameEn, setOrganizationNameEn] = useState<string>("");
  const [organizationNameAr, setOrganizationNameAr] = useState<string>("");
  const [departmentEn, setDepartmentEn] = useState<string>("");
  const [departmentAr, setDepartmentAr] = useState<string>("");
  const [jobTitleEn, setJobTitleEn] = useState<string>("");
  const [jobTitleAr, setJobTitleAr] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [openAvatar, setOpenAvatar] = useState<boolean>(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [openRemoveConfirm, setOpenRemoveConfirm] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) return;
    setOrganizationNameEn(profile.organizationNameEn ?? "");
    setOrganizationNameAr(profile.organizationNameAr ?? "");
    setDepartmentEn(profile.departmentEn ?? "");
    setDepartmentAr(profile.departmentAr ?? "");
    setJobTitleEn(profile.jobTitleEn ?? "");
    setJobTitleAr(profile.jobTitleAr ?? "");
    setEmployeeId(profile.employeeId ?? "");
    setContactEmail(profile.contactEmail ?? "");
    setContactPhone(profile.contactPhone ?? "");
  }, [profile]);

  // If onboarding not completed, redirect to onboarding
  const router = useRouter();
  useEffect(() => {
    if (onboarding && onboarding.completed === false) {
      router.replace(`/${locale}/a/onboarding`);
    }
  }, [onboarding, router, locale]);

  // Page view span + analytics
  useEffect(() => {
    void Sentry.startSpan(
      { op: "profile.view", name: "Admin Profile View" },
      async (span) => {
        try {
          if (me) {
            await capture({
              event: "admin_profile_viewed",
              distinctId: me.authUserId as unknown as string,
              properties: {},
            });
          }
          span.setAttribute("status", "ok");
        } catch (e) {
          span.setAttribute("status", "error");
          Sentry.captureException(e);
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(): Promise<void> {
    // validate
    const vErrors: Record<string, string> = {};
    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
      vErrors.contactEmail = "Invalid email format.";
    }
    setErrors(vErrors);
    if (Object.keys(vErrors).length > 0) return;
    setSaving(true);
    await Sentry.startSpan(
      { op: "profile.save", name: "Admin Save Profile" },
      async (span) => {
        try {
          await upsert({
            organizationNameEn: organizationNameEn || undefined,
            organizationNameAr: organizationNameAr || undefined,
            departmentEn: departmentEn || undefined,
            departmentAr: departmentAr || undefined,
            jobTitleEn: jobTitleEn || undefined,
            jobTitleAr: jobTitleAr || undefined,
            employeeId: employeeId || undefined,
            contactEmail: contactEmail || undefined,
            contactPhone: contactPhone || undefined,
          });
          span.setAttribute("status", "ok");
          if (me) {
            await capture({
              event: "admin_profile_saved",
              distinctId: me.authUserId as unknown as string,
              properties: {
                hasOrgEn: Boolean(organizationNameEn),
                hasOrgAr: Boolean(organizationNameAr),
              },
            });
          }
        } catch (e) {
          span.setAttribute("status", "error");
          Sentry.captureException(e);
        } finally {
          setSaving(false);
        }
      },
    );
  }

  const onSaveAvatar = useCallback(async () => {
    // Capture state then close dialog immediately
    const fileToUpload = stagedFile;
    setOpenAvatar(false);
    setStagedFile(null);
    setUploadedFileName(null);

    // Persist in background
    void (async () => {
      await Sentry.startSpan(
        { op: "profile.avatar.save", name: "Admin Save Avatar" },
        async (span) => {
          try {
            if (fileToUpload) {
              setUploading(true);
              const { uploadUrl } = await genUploadUrl({});
              const res = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": fileToUpload.type },
                body: fileToUpload,
              });
              if (!res.ok) throw new Error("UPLOAD_FAILED");
              const json = (await res.json()) as { storageId: string };
              await finalizeUpload({
                storageId: json.storageId as unknown as Id<"_storage">,
              });
              if (me) {
                await capture({
                  event: "admin_avatar_uploaded",
                  distinctId: me.authUserId as unknown as string,
                  properties: {
                    size: fileToUpload.size,
                    type: fileToUpload.type,
                  },
                });
              }
            }
            span.setAttribute("status", "ok");
          } catch (e) {
            span.setAttribute("status", "error");
            Sentry.captureException(e);
          } finally {
            setUploading(false);
          }
        },
      );
    })();
  }, [stagedFile, genUploadUrl, finalizeUpload, me, capture]);

  // Backfill functionality removed from /a; restricted to Super Admin area

  const header: AdminHeader | null = useMemo(() => {
    if (!me) return null;
    const first = (locale === "ar" ? me.firstNameAr : me.firstNameEn) ?? "";
    const last = (locale === "ar" ? me.lastNameAr : me.lastNameEn) ?? "";
    const displayName = [first, last].filter(Boolean).join(" ") || me.email;
    const initials =
      [first?.[0], last?.[0]].filter(Boolean).join("").toUpperCase() ||
      me.email.slice(0, 2).toUpperCase();
    const organization =
      locale === "ar"
        ? profile?.organizationNameAr
        : profile?.organizationNameEn;
    const joined = new Date(me.createdAt).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    return {
      displayName,
      role: me.role,
      email: profile?.contactEmail ?? me.email,
      phone: profile?.contactPhone ?? me.phone,
      employeeId: profile?.employeeId,
      organization: organization,
      joinedText: joined,
      initials,
    } as const;
  }, [me, profile, locale]);

  const loading: boolean =
    me === undefined || profile === undefined || stats === undefined;

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link
                href={`/${locale}/a/opportunities/create`}
                className="inline-flex items-center gap-2"
              >
                <Plus className="size-4" /> {t("actions.newOpportunity")}
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <article className="bg-card h-fit rounded-2xl border p-6 shadow-sm">
              <div className="flex items-center gap-4">
                {profile?.pictureUrl ? (
                  <Image
                    src={profile.pictureUrl}
                    alt={t("aria.avatar")}
                    width={64}
                    height={64}
                    className="size-16 rounded-full border object-cover shadow-xs"
                  />
                ) : (
                  <div className="bg-background text-foreground flex size-16 items-center justify-center rounded-full border text-xl font-semibold shadow-xs">
                    {header?.initials ?? "--"}
                  </div>
                )}
                <div>
                  <h2 className="text-foreground text-lg font-semibold">
                    {header?.displayName ??
                      (loading ? tCommon("loading") : "—")}
                  </h2>
                  <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                    <Shield className="mr-1 size-3" /> {header?.role ?? "ADMIN"}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground size-4" />
                  <span className="text-foreground">
                    {header?.email ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="text-muted-foreground size-4" />
                  <span className="text-foreground">
                    {header?.phone ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground inline-flex size-4 items-center justify-center">
                    #
                  </span>
                  <span className="text-foreground">
                    {header?.employeeId ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="text-muted-foreground size-4" />
                  <span className="text-foreground">
                    {header?.organization ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-muted-foreground size-4" />
                  <span className="text-foreground">
                    {t("joined", { date: header?.joinedText ?? "—" })}
                  </span>
                </div>
              </div>
            </article>
            <article className="bg-card rounded-2xl border p-6 shadow-sm">
              <h3 className="text-foreground mb-4 text-base font-semibold">
                {t("sections.quickActions")}
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <Link href={`/${locale}/a/opportunities`}>
                    {t("actions.manageOpportunities")}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/a/settings`}>
                    {t("actions.accountSettings")}
                  </Link>
                </Button>
                {/* Super Admin backfill action removed from /a */}
              </div>
            </article>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <article className="bg-card rounded-2xl border p-6 shadow-sm">
              <h3 className="text-foreground mb-4 text-base font-semibold">
                {t("sections.overview")}
              </h3>
              {loading ? (
                <p className="text-muted-foreground text-sm">
                  {tCommon("loading")}
                </p>
              ) : (
                <div className="text-foreground grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground text-xs">
                      {t("stats.total")}
                    </div>
                    <div className="text-lg font-semibold">
                      {stats?.totalEvents ?? 0}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground text-xs">
                      {t("stats.published")}
                    </div>
                    <div className="text-lg font-semibold">
                      {stats?.publishedEvents ?? 0}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground text-xs">
                      {t("stats.drafted")}
                    </div>
                    <div className="text-lg font-semibold">
                      {stats?.draftedEvents ?? 0}
                    </div>
                  </div>
                </div>
              )}
            </article>

            <article className="bg-card rounded-2xl border p-6 shadow-sm">
              <h3 className="text-foreground mb-4 text-base font-semibold">
                {t("sections.profileDetails")}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgEn">{t("fields.organizationEn")}</Label>
                  <Input
                    id="orgEn"
                    value={organizationNameEn}
                    onChange={(e) => setOrganizationNameEn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgAr">{t("fields.organizationAr")}</Label>
                  <Input
                    id="orgAr"
                    value={organizationNameAr}
                    onChange={(e) => setOrganizationNameAr(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deptEn">{t("fields.departmentEn")}</Label>
                  <Input
                    id="deptEn"
                    value={departmentEn}
                    onChange={(e) => setDepartmentEn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deptAr">{t("fields.departmentAr")}</Label>
                  <Input
                    id="deptAr"
                    value={departmentAr}
                    onChange={(e) => setDepartmentAr(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobEn">{t("fields.jobTitleEn")}</Label>
                  <Input
                    id="jobEn"
                    value={jobTitleEn}
                    onChange={(e) => setJobTitleEn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobAr">{t("fields.jobTitleAr")}</Label>
                  <Input
                    id="jobAr"
                    value={jobTitleAr}
                    onChange={(e) => setJobTitleAr(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empId">{t("fields.employeeId")}</Label>
                  <Input
                    id="empId"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    {t("fields.contactEmailPrivate")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                  {errors.contactEmail && (
                    <p className="text-destructive text-sm">
                      {errors.contactEmail}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {t("fields.contactPhonePrivate")}
                  </Label>
                  <Input
                    id="phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">{t("fields.avatar")}</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      id="avatar"
                      type="button"
                      variant="secondary"
                      onClick={() => setOpenAvatar(true)}
                      disabled={uploading}
                    >
                      {t("actions.changeAvatar", { default: "Change picture" })}
                    </Button>
                    {profile?.pictureUrl ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setOpenRemoveConfirm(true)}
                      >
                        {t("actions.removeAvatar", { default: "Remove" })}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={onSave} disabled={saving}>
                  {saving ? t("actions.saving") : t("actions.save")}
                </Button>
              </div>
            </article>
          </div>
        </section>
      </div>
      {/* Avatar Dialog */}
      <Dialog open={openAvatar} onOpenChange={setOpenAvatar}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("fields.avatar")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="border-card bg-muted size-16 overflow-hidden rounded-full border">
                {stagedFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(stagedFile)}
                    alt="Staged avatar"
                    className="h-full w-full object-cover"
                  />
                ) : profile?.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.pictureUrl}
                    alt="Current avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="bg-muted flex h-full w-full items-center justify-center text-base font-semibold">
                    {header?.initials ?? "--"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium">
                  {uploadedFileName ??
                    (profile?.pictureUrl
                      ? t("labels.currentProfilePicture")
                      : t("labels.noProfilePicture"))}
                </p>
                {stagedFile && (
                  <button
                    type="button"
                    className="inline-flex items-center text-red-600 hover:text-red-700"
                    onClick={() => {
                      setStagedFile(null);
                      setUploadedFileName(null);
                    }}
                  >
                    <XCircle className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {!stagedFile && (
              <FileUpload
                acceptedFileTypes={["image/png", "image/jpeg", "image/webp"]}
                onUploadSuccess={(file: File) => {
                  setStagedFile(file);
                  setUploadedFileName(file.name);
                }}
              />
            )}

            <div className="flex items-center gap-2 pt-2 ltr:justify-end rtl:justify-start">
              <DialogClose asChild>
                <Button variant="outline">{tCommon("cancel")}</Button>
              </DialogClose>
              <Button onClick={onSaveAvatar} className="gap-2">
                {t("actions.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Avatar Confirmation Dialog */}
      <Dialog open={openRemoveConfirm} onOpenChange={setOpenRemoveConfirm}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("confirmDeleteAvatar.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("confirmDeleteAvatar.hint")}
          </p>
          <div className="flex items-center gap-2 pt-2 ltr:justify-end rtl:justify-start">
            <DialogClose asChild>
              <Button variant="ghost">{t("confirmDeleteAvatar.cancel")}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={async () => {
                setOpenRemoveConfirm(false);
                await Sentry.startSpan(
                  { op: "profile.avatar.remove", name: "Admin Remove Avatar" },
                  async (span) => {
                    try {
                      await clearAvatar({});
                      if (me) {
                        await capture({
                          event: "admin_avatar_cleared",
                          distinctId: me.authUserId as unknown as string,
                          properties: {},
                        });
                      }
                      span.setAttribute("status", "ok");
                    } catch (e) {
                      span.setAttribute("status", "error");
                      Sentry.captureException(e);
                    }
                  },
                );
              }}
            >
              {t("confirmDeleteAvatar.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
