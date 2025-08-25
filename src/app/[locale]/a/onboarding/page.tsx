"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AdminOnboardingPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "en";
  const router = useRouter();
  const me = useQuery(api.rbac.currentUser, {});
  const draft = useQuery(api.adminOnboarding.getMyAdminOnboarding, {});
  const saveDraft = useMutation(api.adminOnboarding.saveAdminDraftDetails);
  const complete = useMutation(api.adminOnboarding.completeAdminOnboarding);
  const capture = useAction(api.analytics.captureEvent);

  const [organizationNameEn, setOrganizationNameEn] = useState<string>("");
  const [organizationNameAr, setOrganizationNameAr] = useState<string>("");
  const [departmentEn, setDepartmentEn] = useState<string>("");
  const [departmentAr, setDepartmentAr] = useState<string>("");
  const [jobTitleEn, setJobTitleEn] = useState<string>("");
  const [jobTitleAr, setJobTitleAr] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [continuing, setContinuing] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!draft) return;
    setOrganizationNameEn(draft.organizationNameEn ?? "");
    setOrganizationNameAr(draft.organizationNameAr ?? "");
    setDepartmentEn(draft.departmentEn ?? "");
    setDepartmentAr(draft.departmentAr ?? "");
    setJobTitleEn(draft.jobTitleEn ?? "");
    setJobTitleAr(draft.jobTitleAr ?? "");
    setContactEmail(draft.contactEmail ?? "");
    setContactPhone(draft.contactPhone ?? "");
  }, [draft]);

  // Page view span + analytics
  useEffect(() => {
    void Sentry.startSpan(
      { op: "onboarding.view", name: "Admin Onboarding View" },
      async (span) => {
        try {
          if (me) {
            await capture({
              event: "admin_onboarding_viewed",
              distinctId: me.authUserId as unknown as string,
              properties: { hasDraft: Boolean(draft) },
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

  async function onSaveDraft(): Promise<void> {
    setSaving(true);
    await Sentry.startSpan(
      { op: "onboarding.save_draft", name: "Admin Save Draft" },
      async (span) => {
        try {
          await saveDraft({
            organizationNameEn: organizationNameEn || undefined,
            organizationNameAr: organizationNameAr || undefined,
            departmentEn: departmentEn || undefined,
            departmentAr: departmentAr || undefined,
            jobTitleEn: jobTitleEn || undefined,
            jobTitleAr: jobTitleAr || undefined,
            // Not finalizing contact here as it's optional during draft
          });
          span.setAttribute("status", "ok");
          if (me) {
            await capture({
              event: "admin_onboarding_draft_saved",
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

  async function onContinue(): Promise<void> {
    setContinuing(true);
    await Sentry.startSpan(
      { op: "onboarding.complete", name: "Admin Complete Onboarding" },
      async (span) => {
        try {
          // Basic validation
          const vErrors: Record<string, string> = {};
          if (!organizationNameEn && !organizationNameAr) {
            vErrors.organization =
              "Organization name is required in at least one language.";
          }
          if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
            vErrors.contactEmail = "Invalid email format.";
          }
          if (Object.keys(vErrors).length > 0) {
            setErrors(vErrors);
            span.setAttribute("status", "error");
            setContinuing(false);
            return;
          }
          await saveDraft({
            organizationNameEn: organizationNameEn || undefined,
            organizationNameAr: organizationNameAr || undefined,
            departmentEn: departmentEn || undefined,
            departmentAr: departmentAr || undefined,
            jobTitleEn: jobTitleEn || undefined,
            jobTitleAr: jobTitleAr || undefined,
          });
          await complete({});
          span.setAttribute("status", "ok");
          if (me) {
            await capture({
              event: "admin_onboarding_completed",
              distinctId: me.authUserId as unknown as string,
              properties: {},
            });
          }
          router.push(`/${locale}/a/profile`);
        } catch (e) {
          span.setAttribute("status", "error");
          Sentry.captureException(e);
        } finally {
          setContinuing(false);
        }
      },
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-foreground text-2xl font-bold">Admin Onboarding</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Provide your organization details to get started. You can edit these
          later in your profile.
        </p>
      </header>

      <section className="bg-card rounded-2xl border p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="orgEn">Organization (EN)</Label>
            <Input
              id="orgEn"
              value={organizationNameEn}
              onChange={(e) => setOrganizationNameEn(e.target.value)}
              onBlur={onSaveDraft}
              placeholder="e.g., Ministry of Youth"
            />
          </div>
          <div>
            <Label htmlFor="orgAr">Organization (AR)</Label>
            <Input
              id="orgAr"
              value={organizationNameAr}
              onChange={(e) => setOrganizationNameAr(e.target.value)}
              onBlur={onSaveDraft}
              placeholder="مثال: وزارة الشباب"
            />
          </div>
        </div>
        {errors.organization && (
          <p className="text-destructive mt-1 text-sm">{errors.organization}</p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="deptEn">Department (EN)</Label>
            <Input
              id="deptEn"
              value={departmentEn}
              onChange={(e) => setDepartmentEn(e.target.value)}
              onBlur={onSaveDraft}
              placeholder="e.g., Partnerships"
            />
          </div>
          <div>
            <Label htmlFor="deptAr">Department (AR)</Label>
            <Input
              id="deptAr"
              value={departmentAr}
              onChange={(e) => setDepartmentAr(e.target.value)}
              onBlur={onSaveDraft}
              placeholder="مثال: الشراكات"
            />
          </div>
          <div>
            <Label htmlFor="titleEn">Job Title (EN)</Label>
            <Input
              id="titleEn"
              value={jobTitleEn}
              onChange={(e) => setJobTitleEn(e.target.value)}
              onBlur={onSaveDraft}
              placeholder="e.g., Program Manager"
            />
          </div>
          <div>
            <Label htmlFor="titleAr">Job Title (AR)</Label>
            <Input
              id="titleAr"
              value={jobTitleAr}
              onChange={(e) => setJobTitleAr(e.target.value)}
              onBlur={onSaveDraft}
              placeholder="مثال: مدير برنامج"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Contact Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
            />
            {errors.contactEmail && (
              <p className="text-destructive mt-1 text-sm">
                {errors.contactEmail}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">Contact Phone (optional)</Label>
            <Input
              id="phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+966 5x xxx xxxx"
            />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/${locale}/a`}>Cancel</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/${locale}/a/profile`}>Skip for now</Link>
            </Button>
            <Button onClick={onContinue} disabled={continuing}>
              {continuing ? "Continuing…" : "Continue"}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-right">
          <Button variant="secondary" onClick={onSaveDraft} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </section>
    </main>
  );
}
