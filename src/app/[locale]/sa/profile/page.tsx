"use client";

import type { ReactElement } from "react";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import * as Sentry from "@sentry/nextjs";
import Image from "next/image";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FileUpload from "@/components/ui/FileUpload";
import {
  CalendarDays,
  Mail,
  Phone,
  Shield,
  Building2,
  XCircle,
} from "lucide-react";

type SAHeader = {
  readonly displayName: string;
  readonly role: string;
  readonly email: string;
  readonly phone?: string;
  readonly employeeId?: string;
  readonly department?: string;
  readonly joinedText: string;
  readonly initials: string;
};

export default function SuperAdminProfilePage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";
  const t = useTranslations("superAdminProfile");
  const tNav = useTranslations("nav");

  const me = useQuery(api.rbac.currentUser, {});
  const profile = useQuery(api.superAdminProfiles.getMySuperAdminProfile, {});
  const upsert = useMutation(api.superAdminProfiles.upsertMySuperAdminProfile);
  const genUploadUrl = useAction(
    api.superAdminProfiles.generateSuperAdminAvatarUploadUrl,
  );
  const finalizeUpload = useMutation(
    api.superAdminProfiles.finalizeSuperAdminAvatarUpload,
  );
  const clearAvatar = useMutation(api.superAdminProfiles.clearSuperAdminAvatar);

  const [email, setEmail] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [openAvatar, setOpenAvatar] = useState<boolean>(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [openRemoveConfirm, setOpenRemoveConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (!profile) return;
    setEmail(profile.email ?? me?.email ?? "");
    setDepartment(profile.department ?? "");
    setEmployeeId(profile.employeeId ?? "");
  }, [profile, me]);

  const onSaveAvatar = useCallback(async () => {
    const fileToUpload = stagedFile;
    setOpenAvatar(false);
    setStagedFile(null);
    setUploadedFileName(null);
    void (async () => {
      await Sentry.startSpan(
        { op: "sa.profile.avatar.save", name: "SA Save Avatar" },
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
  }, [stagedFile, genUploadUrl, finalizeUpload]);

  async function onSave(): Promise<void> {
    setSaving(true);
    await Sentry.startSpan(
      { op: "sa.profile.save", name: "Save SA Profile" },
      async (span) => {
        try {
          await upsert({ email, department, employeeId });
          span.setAttribute("status", "ok");
        } catch (e) {
          span.setAttribute("status", "error");
          Sentry.captureException(e);
        } finally {
          setSaving(false);
        }
      },
    );
  }

  const initials: string = useMemo(() => {
    const e = (profile?.email ?? me?.email ?? "").trim();
    if (!e) return "SA";
    return e.slice(0, 2).toUpperCase();
  }, [profile?.email, me?.email]);

  const header: SAHeader | null = useMemo(() => {
    if (!me) return null;
    const first = me.firstNameEn ?? me.firstNameAr ?? "";
    const last = me.lastNameEn ?? me.lastNameAr ?? "";
    const displayName = [first, last].filter(Boolean).join(" ") || me.email;
    const joined = new Date(me.createdAt).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    return {
      displayName,
      role: me.role,
      email: profile?.email ?? me.email,
      phone: me.phone,
      employeeId: profile?.employeeId,
      department: profile?.department,
      joinedText: joined,
      initials,
    } as const;
  }, [me, profile, initials, locale]);

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
                href={`/${locale}/sa`}
                className="inline-flex items-center gap-2"
              >
                {tNav("dashboard")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/sa/settings`}>
                {t("actions.accountSettings")}
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
                    {header?.displayName ?? "—"}
                  </h2>
                  <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                    <Shield className="mr-1 size-3" />{" "}
                    {header?.role ?? "SUPER_ADMIN"}
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
                    {header?.department ?? "—"}
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
                  <Link href={`/${locale}/sa`}>{tNav("dashboard")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/sa/settings`}>
                    {t("actions.accountSettings")}
                  </Link>
                </Button>
              </div>
            </article>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <article className="bg-card rounded-2xl border p-6 shadow-sm">
              <h3 className="text-foreground mb-4 text-base font-semibold">
                {t("sections.profileDetails")}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("fields.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">{t("fields.department")}</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">{t("fields.employeeId")}</Label>
                  <Input
                    id="employeeId"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
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
                      {t("actions.changeAvatar")}
                    </Button>
                    {profile?.pictureUrl ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setOpenRemoveConfirm(true)}
                      >
                        {t("actions.removeAvatar")}
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
                    alt={t("aria.avatar")}
                    className="h-full w-full object-cover"
                  />
                ) : profile?.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.pictureUrl}
                    alt={t("labels.currentProfilePicture")}
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
                <Button variant="outline">{t("actions.cancel")}</Button>
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
                  { op: "sa.profile.avatar.remove", name: "SA Remove Avatar" },
                  async (span) => {
                    try {
                      await clearAvatar({});
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
