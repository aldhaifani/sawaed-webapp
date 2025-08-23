"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BasicDropdown from "@/components/ui/BasicDropdown";

export type ApplicantProfileDialogProps = {
  readonly userId: Id<"appUsers">;
  readonly locale: "ar" | "en";
  readonly triggerLabel: string;
};

export function ApplicantProfileDialog(
  props: ApplicantProfileDialogProps,
): ReactElement {
  const { userId, locale, triggerLabel } = props;
  const t = useTranslations("profile");
  const [open, setOpen] = useState<boolean>(false);
  // Types describing the minimal shape we read from the query
  type MinimalUser = {
    readonly firstName?: string | null;
    readonly lastName?: string | null;
    readonly email?: string | null;
    readonly phone?: string | null;
    readonly gender?: string | null;
  };
  type MinimalProfile = {
    readonly headline?: string | null;
    readonly bio?: string | null;
    readonly completionPercentage?: number | null;
    readonly region?: string | null;
    readonly city?: string | null;
  };
  type Education = {
    readonly _id: string | number;
    readonly institution?: string | null;
    readonly degree?: string | null;
    readonly field?: string | null;
  };
  type Skill = { readonly id: string | number; readonly name: string };
  type Interest = { readonly id: string | number; readonly name: string };
  type Experience = {
    readonly _id: string | number;
    readonly title?: string | null;
    readonly organization?: string | null;
  };
  type Project = {
    readonly _id: string | number;
    readonly title?: string | null;
    readonly period?: string | null;
  };
  type Award = {
    readonly _id: string | number;
    readonly title?: string | null;
    readonly issuer?: string | null;
  };
  type Activity = {
    readonly _id: string | number;
    readonly title?: string | null;
    readonly status?: string | null;
  };
  type ProfileComposite =
    | {
        readonly user?: MinimalUser | null;
        readonly profile?: MinimalProfile | null;
        readonly education?: readonly Education[] | null;
        readonly skills?: readonly Skill[] | null;
        readonly interests?: readonly Interest[] | null;
        readonly experiences?: readonly Experience[] | null;
        readonly projects?: readonly Project[] | null;
        readonly awards?: readonly Award[] | null;
        readonly activities?: readonly Activity[] | null;
      }
    | null
    | undefined;

  const data: ProfileComposite = useQuery(
    api.profiles.getProfileCompositeByUserId,
    {
      userId,
      locale,
    },
  );

  type SectionKey =
    | "identity"
    | "education"
    | "skills"
    | "interests"
    | "experience"
    | "projects"
    | "awards"
    | "activities";
  const [section, setSection] = useState<SectionKey>("identity");
  const sections: readonly { key: SectionKey; label: string }[] = useMemo(
    () => [
      { key: "identity", label: t("tabs.identity") },
      { key: "education", label: t("tabs.education") },
      { key: "skills", label: t("tabs.skills") },
      { key: "interests", label: t("tabs.interests") },
      { key: "experience", label: t("tabs.experience") },
      { key: "projects", label: t("tabs.projects") },
      { key: "awards", label: t("tabs.awards") },
      { key: "activities", label: t("tabs.activities") },
    ],
    [t],
  );

  type IdentityItem = { label: string; value: string };
  const identity: readonly IdentityItem[] = useMemo(() => {
    if (!data) return [];
    const email = data.user?.email ?? "";
    const phone = data.user?.phone ?? "";
    const gender = data.user?.gender ?? "";
    const headline = data.profile?.headline ?? "";
    const bio = data.profile?.bio ?? "";
    const completion = `${data.profile?.completionPercentage ?? 0}%`;
    const region = data.profile?.region ?? "";
    const city = data.profile?.city ?? "";
    return [
      { label: t("labels.headline"), value: headline },
      { label: t("labels.bio"), value: bio },
      { label: t("labels.gender"), value: gender },
      { label: t("labels.email"), value: email },
      { label: t("labels.phone"), value: phone },
      { label: t("labels.region"), value: region },
      { label: t("labels.city"), value: city },
      { label: t("labels.completion"), value: completion },
    ];
  }, [data, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[95vw] overflow-visible sm:max-w-4xl"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <div className="flex max-h-[80vh] w-full flex-col">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="break-words">
              {(() => {
                const fullName =
                  `${data?.user?.firstName ?? ""} ${data?.user?.lastName ?? ""}`.trim();
                if (fullName.length > 0) return fullName;
                return data?.user?.email ?? "Profile";
              })()}
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pt-3">
            <div
              dir={locale === "ar" ? "rtl" : "ltr"}
              className="w-full sm:w-72"
            >
              <BasicDropdown
                label={t("tabs.identity")}
                items={sections.map((s) => ({ id: s.key, label: s.label }))}
                selectedId={section}
                onChange={(item) => setSection(item.id as SectionKey)}
                className="w-full"
              />
            </div>
          </div>

          <div className="overflow-x-hidden overflow-y-auto p-4">
            {section === "identity" &&
              (data === undefined ? (
                <div className="text-muted-foreground text-sm">Loading...</div>
              ) : identity.length > 0 ? (
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {identity.map((it) => (
                    <div key={it.label} className="rounded-md border p-3">
                      <dt className="text-muted-foreground text-xs">
                        {it.label}
                      </dt>
                      <dd className="text-sm break-words">{it.value || "-"}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="text-muted-foreground text-sm">-</div>
              ))}

            {section === "education" &&
              (data?.education && data.education.length > 0 ? (
                <ul className="space-y-2">
                  {data.education.map((e) => {
                    const institution = e.institution ?? "";
                    const degree = e.degree ?? "";
                    const field = e.field ?? "";
                    return (
                      <li key={String(e._id)} className="rounded-md border p-3">
                        <div className="font-semibold">{institution}</div>
                        <div className="text-muted-foreground text-xs break-words">
                          {degree} · {field}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-muted-foreground text-sm">-</div>
              ))}

            {section === "skills" && (
              <div className="flex flex-wrap gap-2">
                {(data?.skills ?? []).map((s) => (
                  <span
                    key={String(s.id)}
                    className="bg-background rounded-full border px-3 py-1 text-sm"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            {section === "interests" && (
              <div className="flex flex-wrap gap-2">
                {(data?.interests ?? []).map((i) => (
                  <span
                    key={String(i.id)}
                    className="bg-background rounded-full border px-3 py-1 text-sm"
                  >
                    {i.name}
                  </span>
                ))}
              </div>
            )}

            {section === "experience" &&
              (data?.experiences && data.experiences.length > 0 ? (
                <ul className="space-y-2">
                  {data.experiences.map((e) => (
                    <li key={String(e._id)} className="rounded-md border p-3">
                      <div className="font-semibold">{e.title ?? ""}</div>
                      <div className="text-muted-foreground text-xs">
                        {e.organization ?? ""}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground text-sm">-</div>
              ))}

            {section === "projects" &&
              (data?.projects && data.projects.length > 0 ? (
                <ul className="space-y-2">
                  {data.projects.map((p) => (
                    <li key={String(p._id)} className="rounded-md border p-3">
                      <div className="font-semibold">{p.title ?? ""}</div>
                      <div className="text-muted-foreground text-xs">
                        {p.period ?? ""}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground text-sm">-</div>
              ))}

            {section === "awards" &&
              (data?.awards && data.awards.length > 0 ? (
                <ul className="space-y-2">
                  {data.awards.map((a) => (
                    <li key={String(a._id)} className="rounded-md border p-3">
                      <div className="font-semibold">{a.title ?? ""}</div>
                      <div className="text-muted-foreground text-xs">
                        {a.issuer ?? ""}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground text-sm">-</div>
              ))}

            {section === "activities" &&
              (data?.activities && data.activities.length > 0 ? (
                <ul className="space-y-2">
                  {data.activities.map((a) => (
                    <li key={String(a._id)} className="rounded-md border p-3">
                      <div className="text-sm">
                        {a.title ?? `Application ${String(a._id)}`}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {a.status ?? ""}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground text-sm">-</div>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
