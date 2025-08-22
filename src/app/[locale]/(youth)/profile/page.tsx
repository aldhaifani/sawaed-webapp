"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import BasicDropdown from "@/components/ui/BasicDropdown";
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
import { TaxonomySelectorGroup } from "@/components/taxonomies/taxonomy-selector-group";
import FileUpload from "@/components/ui/FileUpload";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InfoGrid, type FieldItem } from "@/components/youths/profile/InfoGrid";
import { SectionCard } from "@/components/youths/profile/SectionCard";
import { TabButton } from "@/components/youths/profile/TabButton";
import {
  ExperienceForm,
  type ExperiencePayload,
} from "@/components/youths/profile/ExperienceForm";
import {
  ProjectForm,
  type ProjectPayload,
} from "@/components/youths/profile/ProjectForm";
import {
  AwardForm,
  type AwardPayload,
} from "@/components/youths/profile/AwardForm";
import {
  EduForm,
  type EducationItem,
} from "@/components/youths/profile/EduForm";
import type { LucideIcon as IconType } from "lucide-react";
import {
  Pen,
  Eye,
  School,
  Shield,
  Trophy,
  User2,
  Briefcase,
  Heart,
  Layers,
  FolderGit2,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  Send,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function YouthProfilePage(): ReactElement {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");
  const tOnboarding = useTranslations("onboarding");

  // Types
  type CollaborationStatus = "open" | "closed" | "looking" | "";
  type TabKey =
    | "identity"
    | "education"
    | "skills"
    | "interests"
    | "experience"
    | "projects"
    | "awards"
    | "activities";
  type IdentityForm = {
    readonly headline: string;
    readonly bio: string;
    readonly city: string;
    readonly region: string;
    readonly collaborationStatus: CollaborationStatus;
    readonly pictureUrl?: string;
    readonly phone?: string;
    readonly gender: "male" | "female" | "";
  };
  type Gender = "male" | "female" | "";
  type ExperienceDialogState = {
    readonly open: boolean;
    readonly mode: "create" | "edit";
    readonly id?: Id<"experiences">;
    readonly defaults?: Partial<ExperiencePayload>;
  };
  type ProjectDialogState = {
    readonly open: boolean;
    readonly mode: "create" | "edit";
    readonly id?: Id<"projects">;
    readonly defaults?: Partial<ProjectPayload>;
  };
  type AwardDialogState = {
    readonly open: boolean;
    readonly mode: "create" | "edit";
    readonly id?: Id<"awards">;
    readonly defaults?: Partial<AwardPayload>;
  };
  type EducationDialogState = {
    readonly open: boolean;
    readonly mode: "create" | "edit";
    readonly id?: Id<"education">;
    readonly defaults?: Partial<EducationItem>;
  };
  type ActivityViewItem = {
    title: string;
    status: string;
    icon: IconType;
    tone: string;
  };

  // Data
  const data = useQuery(api.profiles.getMyProfileComposite, {
    locale: locale as "ar" | "en",
  });

  // Mutations / Actions
  const mutateBasics = useMutation(api.profiles.updateProfileBasics);
  const updateUserPhone = useMutation(api.profiles.updateUserPhone);
  const updateUserGender = useMutation(api.profiles.updateUserGender);
  const clearProfilePicture = useMutation(api.profiles.clearProfilePicture);
  const setProfilePictureFromStorageId = useMutation(
    api.profiles.setProfilePictureFromStorageId,
  );
  const generateUploadUrl = useAction(
    api.profiles.generateProfilePictureUploadUrl,
  );
  const createExperience = useMutation(api.profiles.createExperience);
  const updateExperience = useMutation(api.profiles.updateExperience);
  const createProject = useMutation(api.profiles.createProject);
  const updateProject = useMutation(api.profiles.updateProject);
  const createAward = useMutation(api.profiles.createAward);
  const updateAward = useMutation(api.profiles.updateAward);
  const createEdu = useMutation(api.profiles.createEducation);
  const updateEdu = useMutation(api.profiles.updateEducation);
  const mutateTaxonomies = useMutation(api.profiles.setUserTaxonomies);

  // UI State
  const [tab, setTab] = useState<TabKey>("identity");
  const [openIdentity, setOpenIdentity] = useState<boolean>(false);
  const [openSkills, setOpenSkills] = useState<boolean>(false);
  const [taxonomyMode, setTaxonomyMode] = useState<
    "skills" | "interests" | "both"
  >("both");
  const [openExperience, setOpenExperience] = useState<ExperienceDialogState>({
    open: false,
    mode: "create",
  });
  const [openProject, setOpenProject] = useState<ProjectDialogState>({
    open: false,
    mode: "create",
  });
  const [openAward, setOpenAward] = useState<AwardDialogState>({
    open: false,
    mode: "create",
  });
  const [openEducation, setOpenEducation] = useState<EducationDialogState>({
    open: false,
    mode: "create",
  });

  // Form state
  const [identityForm, setIdentityForm] = useState<IdentityForm>({
    headline: "",
    bio: "",
    city: "",
    region: "",
    collaborationStatus: "",
    pictureUrl: undefined,
    phone: undefined,
    gender: "",
  });
  const [phoneNine, setPhoneNine] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [pendingPictureRemoval, setPendingPictureRemoval] =
    useState<boolean>(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<
    readonly Id<"skills">[]
  >([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<
    readonly Id<"interests">[]
  >([]);

  // Region/City mapping (same as onboarding)
  const regionCityMap: Record<string, readonly string[]> = useMemo(
    () => ({
      "Ad Dakhiliyah": [
        "Nizwa",
        "Bahla",
        "Samail",
        "Izki",
        "Bidbid",
        "Adam",
        "Al Hamra",
        "Manah",
        "Jebel Akhdar",
      ],
      "Ad Dhahirah": ["Ibri", "Yanqul", "Dhank"],
      "Al Batinah North": [
        "Sohar",
        "Shinas",
        "Liwa",
        "Saham",
        "Al Khabourah",
        "Suwayq",
      ],
      "Al Batinah South": [
        "Rustaq",
        "Awabi",
        "Nakhl",
        "Wadi al Ma’awil",
        "Barka",
        "Musana’ah",
      ],
      "Al Buraimi": ["Al Buraimi", "Mahdah", "Al Sinainah"],
      "Al Wusta": ["Haima", "others..."],
      "Ash Sharqiyah North": [
        "Ibra",
        "Mudhaibi",
        "Bidiyah",
        "Al Qabil",
        "Wadi Bani Khalid",
        "Dima wa’l Ta’een",
      ],
      "Ash Sharqiyah South": [
        "Sur",
        "Al Kamil wa’l Wafi",
        "Jalan Bani Bu Hassan",
        "Jalan Bani Bu Ali",
        "Masirah",
      ],
      Dhofar: [
        "Salalah",
        "Taqah",
        "Mirbat",
        "Thumrait",
        "Sadah",
        "Rakhyut",
        "Dhalkut",
        "Muqshin",
        "Shalim and the Hallaniyat Islands",
        "Al-Mazyūnah",
      ],
      Muscat: ["Muscat", "Muttrah", "Bawshar", "Seeb", "Al Amarat", "Qurayyat"],
      Musandam: ["Khasab", "Dibba", "Bukha", "Madha"],
    }),
    [],
  );

  const regions = useMemo(() => {
    const arabicMap: Record<string, string> = {
      "Ad Dakhiliyah": "الداخلية",
      "Ad Dhahirah": "الظاهرة",
      "Al Batinah North": "شمال الباطنة",
      "Al Batinah South": "جنوب الباطنة",
      "Al Buraimi": "البريمي",
      "Al Wusta": "الوسطى",
      "Ash Sharqiyah North": "شمال الشرقية",
      "Ash Sharqiyah South": "جنوب الشرقية",
      Dhofar: "ظفار",
      Muscat: "مسقط",
      Musandam: "مسندم",
    };
    return Object.keys(regionCityMap).map((r) => ({
      id: r,
      label: locale === "ar" ? (arabicMap[r] ?? r) : r,
    }));
  }, [regionCityMap, locale]);

  const cities = useMemo(() => {
    if (!identityForm.region) return [] as { id: string; label: string }[];
    const cityAr: Record<string, Record<string, string>> = {
      "Ad Dakhiliyah": {
        Nizwa: "نزوى",
        Bahla: "بهلا",
        Samail: "سمائل",
        Izki: "إزكي",
        Bidbid: "بدبد",
        Adam: "آدم",
        "Al Hamra": "الحمراء",
        Manah: "منح",
        "Jebel Akhdar": "الجبل الأخضر",
      },
      "Ad Dhahirah": { Ibri: "عبري", Yanqul: "ينقل", Dhank: "ضنك" },
      "Al Batinah North": {
        Sohar: "صحار",
        Shinas: "شناص",
        Liwa: "لوى",
        Saham: "صحم",
        "Al Khabourah": "الخابورة",
        Suwayq: "السويق",
      },
      "Al Batinah South": {
        Rustaq: "الرستاق",
        Awabi: "العوابي",
        Nakhl: "نخل",
        "Wadi al Ma’awil": "وادي المعاول",
        Barka: "بركاء",
        "Musana’ah": "المصنعة",
      },
      "Al Buraimi": {
        "Al Buraimi": "البريمي",
        Mahdah: "محضة",
        "Al Sinainah": "السنينة",
      },
      "Al Wusta": { Haima: "هيما", "others...": "أخرى" },
      "Ash Sharqiyah North": {
        Ibra: "إبراء",
        Mudhaibi: "المضيبي",
        Bidiyah: "بدية",
        "Al Qabil": "القابل",
        "Wadi Bani Khalid": "وادي بني خالد",
        "Dima wa’l Ta’een": "دماء والطائيين",
      },
      "Ash Sharqiyah South": {
        Sur: "صور",
        "Al Kamil wa’l Wafi": "الكامل والوافي",
        "Jalan Bani Bu Hassan": "جعلان بني بو حسن",
        "Jalan Bani Bu Ali": "جعلان بني بو علي",
        Masirah: "مصيرة",
      },
      Dhofar: {
        Salalah: "صلالة",
        Taqah: "طاقة",
        Mirbat: "مرباط",
        Thumrait: "ثمريت",
        Sadah: "سدح",
        Rakhyut: "رخيوت",
        Dhalkut: "ضلكوت",
        Muqshin: "مقشن",
        "Shalim and the Hallaniyat Islands": "شليم وجزر الحلانيات",
        "Al-Mazyūnah": "المزيونة",
      },
      Muscat: {
        Muscat: "مسقط",
        Muttrah: "مطرح",
        Bawshar: "بوشر",
        Seeb: "السيب",
        "Al Amarat": "العامرات",
        Qurayyat: "قريات",
      },
      Musandam: { Khasab: "خصب", Dibba: "دبا", Bukha: "بخا", Madha: "مدحاء" },
    };
    const list = regionCityMap[identityForm.region] ?? [];
    return list.map((c) => ({
      id: c,
      label: locale === "ar" ? (cityAr[identityForm.region]?.[c] ?? c) : c,
    }));
  }, [identityForm.region, regionCityMap, locale]);

  // helper to convert empty strings to undefined (to avoid sending empty values)
  const emptyToU = useCallback(
    (s: string): string | undefined => (s.trim().length > 0 ? s : undefined),
    [],
  );

  // Initialize identity form only when dialog is closed (avoid overwriting edits while open)
  useEffect(() => {
    if (!data || openIdentity) return;
    setIdentityForm({
      headline: data.profile?.headline ?? "",
      bio: data.profile?.bio ?? "",
      city: data.profile?.city ?? "",
      region: data.profile?.region ?? "",
      collaborationStatus:
        (data.profile
          ?.collaborationStatus as IdentityForm["collaborationStatus"]) || "",
      pictureUrl: data.profile?.pictureUrl ?? undefined,
      phone: data.user.phone ?? undefined,
      gender: (data.user.gender as Gender) ?? "",
    });
    const p = data.user.phone ?? "";
    const re = /^\+968(\d{0,9})/;
    const m = re.exec(p);
    const nextNine = m?.[1] ?? "";
    setPhoneNine(nextNine);
    setSelectedSkillIds((data.skills ?? []).map((s) => s.id));
    setSelectedInterestIds((data.interests ?? []).map((i) => i.id));
  }, [data, openIdentity]);

  const onOpenIdentity = useCallback(() => setOpenIdentity(true), []);

  const onSaveIdentity = useCallback(async () => {
    // Capture current staging state, then close dialog immediately
    const fileToUpload = stagedFile;
    const shouldRemove = pendingPictureRemoval;
    setOpenIdentity(false);
    setStagedFile(null);
    setPendingPictureRemoval(false);
    setUploadedFileName(null);

    // Run persistence in the background
    void (async () => {
      try {
        const collaboration =
          identityForm.collaborationStatus === ""
            ? undefined
            : identityForm.collaborationStatus;
        await mutateBasics({
          headline: emptyToU(identityForm.headline),
          bio: emptyToU(identityForm.bio),
          pictureUrl: identityForm.pictureUrl ?? undefined,
          collaborationStatus: collaboration,
        });
        // Save phone if valid and changed
        const fullPhone = `+968${phoneNine}`;
        const phoneValid = /^\+968\d{9}$/.test(fullPhone);
        if (phoneValid && fullPhone !== (data?.user.phone ?? "")) {
          await updateUserPhone({ phone: fullPhone });
        }
        // Save gender if changed
        const nextGender =
          identityForm.gender === "" ? undefined : identityForm.gender;
        if (
          nextGender &&
          nextGender !== (data?.user.gender as Gender | undefined)
        ) {
          await updateUserGender({ gender: nextGender });
        }
        // Persist profile picture changes
        if (fileToUpload) {
          const { uploadUrl } = await generateUploadUrl({});
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": fileToUpload.type },
            body: fileToUpload,
          });
          if (!res.ok) throw new Error("UPLOAD_FAILED");
          const json = (await res.json()) as { storageId: string };
          await setProfilePictureFromStorageId({
            storageId: json.storageId as unknown as Id<"_storage">,
          });
        } else if (shouldRemove) {
          await clearProfilePicture({});
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [
    identityForm,
    mutateBasics,
    emptyToU,
    phoneNine,
    data,
    updateUserPhone,
    stagedFile,
    pendingPictureRemoval,
    generateUploadUrl,
    setProfilePictureFromStorageId,
    clearProfilePicture,
    updateUserGender,
    setOpenIdentity,
  ]);

  const onSaveSkills = useCallback(async () => {
    try {
      await mutateTaxonomies({
        skillIds: [...selectedSkillIds],
        interestIds: [...selectedInterestIds],
      });
      setOpenSkills(false);
    } catch (e) {
      console.error(e);
    }
  }, [mutateTaxonomies, selectedSkillIds, selectedInterestIds]);

  // Stable handlers to avoid re-creating onChange function references
  // which can trigger child effects repeatedly and cause update loops
  const handleSkillsChange = useCallback(
    ({ selectedIds }: { selectedIds: string[] }): void => {
      setSelectedSkillIds(
        selectedIds.map(
          (id) => id as unknown as Id<"skills">,
        ) as readonly Id<"skills">[],
      );
    },
    [],
  );

  const handleInterestsChange = useCallback(
    ({ selectedIds }: { selectedIds: string[] }): void => {
      setSelectedInterestIds(
        selectedIds.map(
          (id) => id as unknown as Id<"interests">,
        ) as readonly Id<"interests">[],
      );
    },
    [],
  );

  const tabs = useMemo(
    () =>
      [
        { key: "identity", label: tProfile("tabs.identity"), icon: User2 },
        { key: "education", label: tProfile("tabs.education"), icon: School },
        { key: "skills", label: tProfile("tabs.skills"), icon: Layers },
        { key: "interests", label: tProfile("tabs.interests"), icon: Heart },
        {
          key: "experience",
          label: tProfile("tabs.experience"),
          icon: Briefcase,
        },
        { key: "projects", label: tProfile("tabs.projects"), icon: FolderGit2 },
        { key: "awards", label: tProfile("tabs.awards"), icon: Trophy },
        { key: "activities", label: tProfile("tabs.activities"), icon: Shield },
      ] as const,
    [tProfile],
  );

  // Derived identity fields from backend
  const identity: readonly FieldItem[] = useMemo(() => {
    if (data === undefined) return [];
    if (!data) return [];
    const email = data.user.email ?? "";
    const phone = data.user.phone ?? "";
    const gender =
      data.user.gender === "male"
        ? tOnboarding("male")
        : data.user.gender === "female"
          ? tOnboarding("female")
          : "";
    const city = (() => {
      const p = data.profile as unknown as {
        city?: string | null;
        cityAr?: string | null;
        cityEn?: string | null;
      } | null;
      const ar = (p?.cityAr ?? "").trim();
      const en = (p?.cityEn ?? "").trim();
      const base = (p?.city ?? "").trim();
      return locale === "ar" ? ar || base || en : en || base || ar;
    })();
    const region = (() => {
      const p = data.profile as unknown as {
        region?: string | null;
        regionAr?: string | null;
        regionEn?: string | null;
      } | null;
      const ar = (p?.regionAr ?? "").trim();
      const en = (p?.regionEn ?? "").trim();
      const base = (p?.region ?? "").trim();
      return locale === "ar" ? ar || base || en : en || base || ar;
    })();
    const headline = data.profile?.headline ?? "";
    const completion = `${data.profile?.completionPercentage ?? 0}%`;
    const bio = data.profile?.bio ?? "";
    const items: FieldItem[] = [
      { label: tProfile("labels.headline"), value: headline },
      { label: tProfile("labels.bio"), value: bio },
      { label: tProfile("labels.gender"), value: gender },
      { label: tProfile("labels.email"), value: email },
      { label: tProfile("labels.phone"), value: phone },
      { label: tProfile("labels.region"), value: region },
      { label: tProfile("labels.city"), value: city },
      { label: tProfile("labels.completion"), value: completion },
    ];
    return items as readonly FieldItem[];
  }, [data, locale, tOnboarding, tProfile]);

  const educationItems: readonly (EducationItem & { _id: Id<"education"> })[] =
    useMemo(() => {
      if (!data?.education) return [];
      return data.education.map((e) => ({
        institution: e.institution ?? "",
        degree: e.degree ?? "",
        field: e.field ?? "",
        start: e.startYear ? String(e.startYear) : "",
        end:
          typeof e.endYear === "string"
            ? e.endYear
            : e.endYear
              ? String(e.endYear)
              : "",
        description: e.description ?? undefined,
        _id: e._id,
      }));
    }, [data]);

  const skills = useMemo(
    () => (data?.skills ?? []).map((s) => s.name),
    [data],
  ) as readonly string[];

  const interests = useMemo(
    () => (data?.interests ?? []).map((i) => i.name),
    [data],
  ) as readonly string[];

  const experiences = useMemo(
    () =>
      (data?.experiences ?? []).map((e) => ({
        id: e._id,
        title: e.title ?? "",
        organization: e.organization ?? "",
        startDate: e.startDate ?? undefined,
        endDate: e.endDate ?? undefined,
        period: [
          e.startDate ? new Date(e.startDate).getFullYear() : "",
          e.endDate ? new Date(e.endDate).getFullYear() : tProfile("present"),
        ]
          .filter(Boolean)
          .join(" – "),
        description: e.description ?? "",
      })),
    [data, tProfile],
  ) as readonly {
    id: Id<"experiences">;
    title: string;
    organization: string;
    startDate?: number;
    endDate?: number;
    period: string;
    description: string;
  }[];

  const projects = useMemo(
    () =>
      (data?.projects ?? []).map((p) => ({
        id: p._id,
        title: p.title ?? "",
        period: p.period ?? "",
        detail: p.description ?? "",
        url: p.url ?? "",
      })),
    [data],
  ) as readonly {
    id: Id<"projects">;
    title: string;
    period: string;
    detail: string;
    url?: string;
  }[];

  const awards = useMemo(
    () =>
      (data?.awards ?? []).map((a) => ({
        id: a._id,
        title: a.title ?? "",
        issuer: a.issuer ?? "",
        year: a.year ? String(a.year) : "",
      })),
    [data],
  ) as readonly {
    id: Id<"awards">;
    title: string;
    issuer: string;
    year: string;
  }[];

  // Activities derived from eventRegistrations
  const activities = useMemo(() => {
    const statuses = [
      "accepted",
      "pending",
      "rejected",
      "cancelled",
      "waitlisted",
    ] as const;
    type ActivityStatus = (typeof statuses)[number];
    const statusTone: Record<ActivityStatus, { icon: IconType; tone: string }> =
      {
        accepted: { icon: CheckCircle2, tone: "text-green-700 bg-green-100" },
        pending: { icon: Clock, tone: "text-amber-700 bg-amber-100" },
        rejected: { icon: XCircle, tone: "text-red-700 bg-red-100" },
        cancelled: { icon: Archive, tone: "text-muted-foreground bg-muted" },
        waitlisted: { icon: Send, tone: "text-blue-700 bg-blue-100" },
      };
    type ActivityDoc = {
      status?: string;
      title?: string;
      opportunityTitle?: string;
      _id?: string;
    };
    return (data?.activities ?? []).map((a: ActivityDoc) => {
      const raw = String(a.status ?? "pending");
      const status: ActivityStatus = (statuses as readonly string[]).includes(
        raw,
      )
        ? (raw as ActivityStatus)
        : "pending";
      const selected = statusTone[status];
      const { icon, tone } = selected;
      return {
        title: a.title ?? a.opportunityTitle ?? `Application ${a._id ?? ""}`,
        status,
        icon,
        tone,
      } as ActivityViewItem;
    });
  }, [data]) as readonly ActivityViewItem[];

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="text-foreground mb-4 text-3xl font-bold sm:text-4xl">
          {tProfile("title")}
        </h1>

        {/* Header removed as requested */}

        {/* Responsive layout: sidebar on md+, horizontal tabs on mobile */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          {/* Mobile dropdown tabs */}
          <div className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 -mx-4 border-y px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:hidden">
            <BasicDropdown
              key={tab}
              className="w-full"
              label={tabs.find((t) => t.key === tab)?.label ?? tabs[0].label}
              items={tabs.map((t) => ({
                id: t.key,
                label: t.label,
                icon: <t.icon className="h-4 w-4" />,
              }))}
              onChange={(item) => setTab(item.id as TabKey)}
            />
          </div>

          {/* Desktop sidebar vertical tabs */}
          <aside className="hidden md:block">
            <div className="bg-card sticky top-6 rounded-xl border p-3 shadow-sm">
              <nav className="flex flex-col gap-2">
                {tabs.map((t) => (
                  <TabButton
                    key={t.key}
                    label={t.label}
                    icon={t.icon}
                    isActive={tab === (t.key as TabKey)}
                    onClick={() => setTab(t.key as TabKey)}
                  />
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-6">
            {tab === "identity" && (
              <SectionCard
                title={tProfile("section.profileInfo")}
                actionType="Edit"
                actionLabel={tProfile("actions.edit")}
                onAction={onOpenIdentity}
              >
                {data === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    {tCommon("loading")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="border-card bg-muted size-16 overflow-hidden rounded-full border">
                          {data?.profile?.pictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={data.profile.pictureUrl}
                              alt="Profile picture"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="bg-muted flex h-full w-full items-center justify-center text-base font-semibold">
                              {(() => {
                                const first = data?.user.firstName?.[0] ?? "";
                                const last = data?.user.lastName?.[0] ?? "";
                                const fallback = (data?.user.email ?? "")
                                  .slice(0, 1)
                                  .toUpperCase();
                                const initials =
                                  `${first}${last}`.trim() || fallback;
                                return initials;
                              })()}
                            </div>
                          )}
                        </div>
                        {(() => {
                          const status = data?.profile?.collaborationStatus;
                          const emoji =
                            status === "open"
                              ? "🤝"
                              : status === "looking"
                                ? "👀"
                                : status === "closed"
                                  ? "🔒"
                                  : "";
                          return emoji ? (
                            <div className="absolute bottom-0 translate-y-1 ltr:right-0 ltr:translate-x-1 rtl:left-0 rtl:-translate-x-1">
                              <span className="bg-secondary text-secondary-foreground rounded-full px-1 py-[1px] text-sm leading-none">
                                {emoji}
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-foreground text-lg font-semibold">
                          {`${data?.user.firstName ?? ""} ${data?.user.lastName ?? ""}`.trim() ||
                            (data?.user.email ?? "")}
                        </h2>
                      </div>
                    </div>
                    {identity.length > 0 ? (
                      <InfoGrid items={identity} />
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        {tProfile("empty.noInfo")}
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            )}

            {tab === "education" && (
              <SectionCard
                title={tProfile("tabs.education")}
                actionType="Add"
                actionLabel={tProfile("actions.add")}
                onAction={() =>
                  setOpenEducation({ open: true, mode: "create" })
                }
              >
                {data === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    {tCommon("loading")}
                  </div>
                ) : educationItems.length > 0 ? (
                  <ul className="space-y-3">
                    {educationItems.map((e) => (
                      <li
                        key={`${e.institution}-${e.start}`}
                        className="bg-background rounded-md border p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-sm font-semibold">
                              {e.institution}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {e.degree} · {e.field}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-muted-foreground text-xs">
                              {e.start} – {e.end}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1"
                              onClick={() =>
                                setOpenEducation({
                                  open: true,
                                  mode: "edit",
                                  id: e._id,
                                  defaults: e,
                                })
                              }
                            >
                              <Pen className="size-3" />{" "}
                              {tProfile("actions.edit")}
                            </Button>
                          </div>
                        </div>
                        {e.description ? (
                          <p className="text-foreground/80 mt-2 text-sm">
                            {e.description}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {tProfile("empty.noEducation")}
                  </div>
                )}
              </SectionCard>
            )}

            {tab === "skills" && (
              <SectionCard
                title={tProfile("tabs.skills")}
                actionType="Edit"
                actionLabel={tProfile("actions.edit")}
                onAction={() => {
                  setTaxonomyMode("skills");
                  setOpenSkills(true);
                }}
              >
                {data === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    {tCommon("loading")}
                  </div>
                ) : skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="bg-background text-foreground rounded-full border px-3 py-1 text-sm"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {tProfile("empty.noSkills")}
                  </div>
                )}
              </SectionCard>
            )}

            {tab === "interests" && (
              <SectionCard
                title={tProfile("tabs.interests")}
                actionType="Edit"
                actionLabel={tProfile("actions.edit")}
                onAction={() => {
                  setTaxonomyMode("interests");
                  setOpenSkills(true);
                }}
              >
                {data === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    {tCommon("loading")}
                  </div>
                ) : interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((s) => (
                      <span
                        key={s}
                        className="bg-background text-foreground rounded-full border px-3 py-1 text-sm"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {tProfile("empty.noInterests")}
                  </div>
                )}
              </SectionCard>
            )}

            {tab === "experience" && (
              <SectionCard
                title={tProfile("tabs.experience")}
                actionType="Add"
                actionLabel={tProfile("actions.add")}
                onAction={() =>
                  setOpenExperience({ open: true, mode: "create" })
                }
              >
                {data === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    {tCommon("loading")}
                  </div>
                ) : experiences.length > 0 ? (
                  <ul className="space-y-3">
                    {experiences.map((e) => (
                      <li
                        key={e.id}
                        className="bg-background rounded-md border p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-foreground text-sm font-semibold">
                              {e.title}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {e.organization}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-muted-foreground text-xs">
                              {e.period}
                            </div>
                            <button
                              type="button"
                              className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                              onClick={() =>
                                setOpenExperience({
                                  open: true,
                                  mode: "edit",
                                  id: e.id,
                                  defaults: {
                                    title: e.title,
                                    organization: e.organization,
                                    startDate: e.startDate,
                                    endDate: e.endDate,
                                    description: e.description,
                                  },
                                })
                              }
                            >
                              <Pen className="size-3" />{" "}
                              {tProfile("actions.edit")}
                            </button>
                          </div>
                        </div>
                        <p className="text-foreground/80 mt-2 text-sm">
                          {e.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {tProfile("empty.noExperience")}
                  </div>
                )}
              </SectionCard>
            )}

            {tab === "projects" && (
              <SectionCard
                title={tProfile("tabs.projects")}
                actionType="Add"
                actionLabel={tProfile("actions.add")}
                onAction={() => setOpenProject({ open: true, mode: "create" })}
              >
                {data === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    {tCommon("loading")}
                  </div>
                ) : projects.length > 0 ? (
                  <ul className="space-y-3">
                    {projects.map((p) => (
                      <li
                        key={p.title}
                        className="bg-background rounded-md border p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <p className="text-foreground text-sm font-semibold">
                            {p.title}
                          </p>
                          <span className="text-muted-foreground flex items-center gap-2 text-xs">
                            {p.period}
                            <button
                              type="button"
                              className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                              onClick={() =>
                                setOpenProject({
                                  open: true,
                                  mode: "edit",
                                  id: p.id,
                                  defaults: {
                                    title: p.title,
                                    period: p.period,
                                    description: p.detail,
                                    url: p.url,
                                  },
                                })
                              }
                            >
                              <Pen className="size-3" />{" "}
                              {tProfile("actions.edit")}
                            </button>
                          </span>
                        </div>
                        <p className="text-foreground/80 mt-2 text-sm">
                          {p.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {tProfile("empty.noProjects")}
                  </div>
                )}
              </SectionCard>
            )}

            {tab === "awards" && (
              <SectionCard
                title={tProfile("tabs.awards")}
                actionType="Add"
                actionLabel={tProfile("actions.add")}
                onAction={() => setOpenAward({ open: true, mode: "create" })}
              >
                {data === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    {tCommon("loading")}
                  </div>
                ) : awards.length > 0 ? (
                  <ul className="space-y-3">
                    {awards.map((a) => (
                      <li
                        key={a.title}
                        className="bg-background rounded-md border p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-foreground text-sm font-semibold">
                              {a.title}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {a.issuer}
                            </p>
                          </div>
                          <span className="text-muted-foreground flex items-center gap-2 text-xs">
                            {a.year}
                            <button
                              type="button"
                              className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                              onClick={() =>
                                setOpenAward({
                                  open: true,
                                  mode: "edit",
                                  id: a.id,
                                  defaults: {
                                    title: a.title,
                                    issuer: a.issuer,
                                    year: a.year ? Number(a.year) : undefined,
                                  },
                                })
                              }
                            >
                              <Pen className="size-3" />{" "}
                              {tProfile("actions.edit")}
                            </button>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {tProfile("empty.noAwards")}
                  </div>
                )}
              </SectionCard>
            )}

            {tab === "activities" && (
              <SectionCard title={tProfile("activities.title")}>
                {data === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    {tCommon("loading")}
                  </div>
                ) : activities.length > 0 ? (
                  <ul className="space-y-3">
                    {activities.map((a) => (
                      <li
                        key={a.title}
                        className="bg-background flex items-center justify-between gap-3 rounded-md border p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-sm font-semibold">
                            {a.title}
                          </p>
                          <div
                            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${a.tone}`}
                          >
                            <a.icon className="size-3" />
                            <span>
                              {tProfile(`activities.status.${a.status}`)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"
                        >
                          <Eye className="size-3" /> {tProfile("actions.view")}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {tProfile("empty.noActivities")}
                  </div>
                )}
              </SectionCard>
            )}
          </div>
        </div>
      </div>

      {/* Identity Dialog */}
      <Dialog
        open={openIdentity}
        onOpenChange={(o) => {
          if (!o) {
            setStagedFile(null);
            setPendingPictureRemoval(false);
            setUploadedFileName(null);
          }
          setOpenIdentity(o);
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto p-0"
        >
          <DialogHeader className="border-b p-4">
            <DialogTitle>{tProfile("dialog.editProfile")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="w-full space-y-2 sm:col-span-2">
                <Label htmlFor="headline">{tProfile("labels.headline")}</Label>
                <Input
                  id="headline"
                  value={identityForm.headline}
                  onChange={(e) =>
                    setIdentityForm((p) => ({ ...p, headline: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">{tProfile("labels.bio")}</Label>
                <Textarea
                  id="bio"
                  value={identityForm.bio}
                  onChange={(e) =>
                    setIdentityForm((p) => ({ ...p, bio: e.target.value }))
                  }
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">{tProfile("labels.region")}</Label>
                <BasicDropdown
                  label={identityForm.region || tOnboarding("selectRegion")}
                  items={regions}
                  onChange={(i) =>
                    setIdentityForm((p) => ({
                      ...p,
                      region: String(i.id),
                      city: "",
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{tProfile("labels.city")}</Label>
                <BasicDropdown
                  label={identityForm.city || tOnboarding("selectCity")}
                  items={cities}
                  onChange={(i) =>
                    setIdentityForm((p) => ({ ...p, city: String(i.id) }))
                  }
                  className="w-full"
                />
              </div>

              <div className="flex flex-col justify-center space-y-2 sm:col-span-2">
                <Label htmlFor="phone">{tProfile("labels.phone")}</Label>
                <div className="flex items-center rtl:flex-row-reverse rtl:justify-end">
                  <span className="text-foreground inline-flex items-center rounded-l-md px-2 text-sm">
                    +968
                  </span>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    pattern="\\d{9}"
                    value={phoneNine}
                    onChange={(e) => {
                      const next = e.target.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 9);
                      setPhoneNine(next);
                      if (next.length === 0) setPhoneError("");
                      else
                        setPhoneError(
                          next.length === 9
                            ? ""
                            : tProfile("validation.phoneNineDigits"),
                        );
                    }}
                    className="w-50 rounded-l-none text-left"
                    placeholder="912345678"
                  />
                </div>
                {phoneError ? (
                  <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>{tProfile("labels.gender")}</Label>
                <RadioGroup
                  value={identityForm.gender}
                  onValueChange={(val) =>
                    setIdentityForm((p) => ({
                      ...p,
                      gender: (val as Gender) || "",
                    }))
                  }
                  className="flex gap-10 rtl:flex-row-reverse"
                >
                  <div className="flex items-center gap-3 rtl:flex-row-reverse">
                    <RadioGroupItem value="male" id="r1" />
                    <Label htmlFor="r1">{tOnboarding("male")}</Label>
                  </div>
                  <div className="flex items-center gap-3 rtl:flex-row-reverse">
                    <RadioGroupItem value="female" id="r2" />
                    <Label htmlFor="r2">{tOnboarding("female")}</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{tProfile("labels.collaboration")}</Label>
                <RadioGroup
                  value={identityForm.collaborationStatus}
                  onValueChange={(val) =>
                    setIdentityForm((p) => ({
                      ...p,
                      collaborationStatus:
                        (val as IdentityForm["collaborationStatus"]) || "",
                    }))
                  }
                  className="flex gap-10 rtl:flex-row-reverse"
                >
                  <div className="flex items-center gap-3 rtl:flex-row-reverse">
                    <RadioGroupItem value="open" id="r3" />
                    <Label htmlFor="r3">{tProfile("collab.open")}</Label>
                  </div>
                  <div className="flex items-center gap-3 rtl:flex-row-reverse">
                    <RadioGroupItem value="looking" id="r4" />
                    <Label htmlFor="r4">{tProfile("collab.looking")}</Label>
                  </div>
                  <div className="flex items-center gap-3 rtl:flex-row-reverse">
                    <RadioGroupItem value="closed" id="r5" />
                    <Label htmlFor="r5">{tProfile("collab.closed")}</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{tProfile("labels.profilePicture")}</Label>
                {(() => {
                  const hasStaged = Boolean(stagedFile);
                  const hasExisting =
                    Boolean(identityForm.pictureUrl) &&
                    !pendingPictureRemoval &&
                    !hasStaged;
                  if (hasStaged || hasExisting) {
                    return (
                      <div className="bg-muted text-foreground inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <span className="max-w-[260px] truncate">
                          {uploadedFileName ??
                            (hasExisting
                              ? tProfile("labels.currentProfilePicture")
                              : "")}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (hasStaged) {
                              setStagedFile(null);
                              setUploadedFileName(null);
                            } else if (hasExisting) {
                              setPendingPictureRemoval(true);
                            }
                            setIdentityForm((p) => ({
                              ...p,
                              pictureUrl: hasExisting
                                ? p.pictureUrl
                                : undefined,
                            }));
                          }}
                        >
                          <XCircle className="size-4" />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <FileUpload
                      acceptedFileTypes={[
                        "image/png",
                        "image/jpeg",
                        "image/webp",
                      ]}
                      onUploadSuccess={(file: File) => {
                        setStagedFile(file);
                        setUploadedFileName(file.name);
                        setPendingPictureRemoval(false);
                        setIdentityForm((p) => ({
                          ...p,
                          pictureUrl: "uploaded",
                        }));
                      }}
                    />
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="ghost">{tProfile("actions.cancel")}</Button>
              </DialogClose>
              <Button onClick={onSaveIdentity} className="gap-2">
                {tProfile("actions.saveChanges")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Experience Dialog (create/edit) */}
      <Dialog
        open={openExperience.open}
        onOpenChange={(o) => setOpenExperience((p) => ({ ...p, open: o }))}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto p-0"
        >
          <DialogHeader className="border-b p-4">
            <DialogTitle>
              {openExperience.mode === "create"
                ? tProfile("dialog.addExperience")
                : tProfile("dialog.editExperience")}
            </DialogTitle>
          </DialogHeader>
          <ExperienceForm
            defaults={openExperience.defaults}
            onCancel={() => setOpenExperience((p) => ({ ...p, open: false }))}
            onSubmit={async (payload: ExperiencePayload) => {
              try {
                if (openExperience.mode === "create") {
                  await createExperience(payload);
                } else if (
                  openExperience.mode === "edit" &&
                  openExperience.id
                ) {
                  await updateExperience({ id: openExperience.id, ...payload });
                }
                setOpenExperience((p) => ({ ...p, open: false }));
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Project Dialog (create/edit) */}
      <Dialog
        open={openProject.open}
        onOpenChange={(o) => setOpenProject((p) => ({ ...p, open: o }))}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto p-0"
        >
          <DialogHeader className="border-b p-4">
            <DialogTitle>
              {openProject.mode === "create"
                ? tProfile("dialog.addProject")
                : tProfile("dialog.editProject")}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            defaults={openProject.defaults}
            onCancel={() => setOpenProject((p) => ({ ...p, open: false }))}
            onSubmit={async (payload: ProjectPayload) => {
              try {
                if (openProject.mode === "create") {
                  await createProject(payload);
                } else if (openProject.mode === "edit" && openProject.id) {
                  await updateProject({ id: openProject.id, ...payload });
                }
                setOpenProject((p) => ({ ...p, open: false }));
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Award Dialog (create/edit) */}
      <Dialog
        open={openAward.open}
        onOpenChange={(o) => setOpenAward((p) => ({ ...p, open: o }))}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto p-0"
        >
          <DialogHeader className="border-b p-4">
            <DialogTitle>
              {openAward.mode === "create"
                ? tProfile("dialog.addAward")
                : tProfile("dialog.editAward")}
            </DialogTitle>
          </DialogHeader>
          <AwardForm
            defaults={openAward.defaults}
            onCancel={() => setOpenAward((p) => ({ ...p, open: false }))}
            onSubmit={async (payload: AwardPayload) => {
              try {
                if (openAward.mode === "create") {
                  await createAward(payload);
                } else if (openAward.mode === "edit" && openAward.id) {
                  await updateAward({ id: openAward.id, ...payload });
                }
                setOpenAward((p) => ({ ...p, open: false }));
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Skills & Interests Dialog */}
      <Dialog open={openSkills} onOpenChange={setOpenSkills}>
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] w-[95vw] max-w-2xl overflow-y-auto p-0"
        >
          <DialogHeader className="border-b p-4">
            <DialogTitle>
              {taxonomyMode === "skills"
                ? tProfile("dialog.editSkillsTalents")
                : taxonomyMode === "interests"
                  ? tProfile("dialog.editInterestsHobbies")
                  : tProfile("dialog.editSkillsInterests")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TaxonomySelectorGroup
                layout="tabs"
                mode={taxonomyMode}
                titleSkills={tProfile("tabs.skills")}
                titleInterests={tProfile("tabs.interests")}
                skillInitialSelected={
                  selectedSkillIds as unknown as readonly string[]
                }
                interestInitialSelected={
                  selectedInterestIds as unknown as readonly string[]
                }
                onSkillsChange={handleSkillsChange}
                onInterestsChange={handleInterestsChange}
              />
            </div>
            <div className="col-span-1 flex items-center justify-end gap-2 sm:col-span-2">
              <DialogClose asChild>
                <Button variant="ghost">{tProfile("actions.cancel")}</Button>
              </DialogClose>
              <Button onClick={onSaveSkills} className="gap-2">
                {tProfile("actions.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Education Dialog (create/edit) */}
      <Dialog
        open={openEducation.open}
        onOpenChange={(o) => setOpenEducation((p) => ({ ...p, open: o }))}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto p-0"
        >
          <DialogHeader className="border-b p-4">
            <DialogTitle>
              {openEducation.mode === "create"
                ? tProfile("dialog.addEducation")
                : tProfile("dialog.editEducation")}
            </DialogTitle>
          </DialogHeader>
          <EduForm
            defaults={openEducation.defaults}
            onCancel={() => setOpenEducation((p) => ({ ...p, open: false }))}
            onSubmit={async (payload) => {
              try {
                if (openEducation.mode === "create") {
                  await createEdu(payload);
                } else if (openEducation.mode === "edit" && openEducation.id) {
                  await updateEdu({ id: openEducation.id, ...payload });
                }
                setOpenEducation((p) => ({ ...p, open: false }));
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
