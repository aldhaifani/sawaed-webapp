"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Progress } from "@/components/ui/progress";
import BasicDropdown from "@/components/ui/BasicDropdown";
import { TaxonomySelector } from "@/components/taxonomies/taxonomy-selector";
import type { Id } from "@/../convex/_generated/dataModel";
import { LogoIcon } from "@/components/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

/**
 * Youth Onboarding: 3 steps
 * 1) Welcome
 * 2) Basic details (Arabic/English names + city/region using BasicDropdown)
 * 3) Pick at least 1 skill and 1 interest; persist and complete
 */
export default function YouthOnboardingPage(): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "ar";
  const t = useTranslations("onboarding");
  const router = useRouter();

  const status = useQuery(api.onboarding.getStatus, {});
  const draft = useQuery(api.onboarding.getDraft, {});
  const setStep = useMutation(api.onboarding.setStep);
  const saveDetails = useMutation(api.onboarding.upsertBasicDetails);
  const saveDraftDetails = useMutation(api.onboarding.saveDraftDetails);
  const setTaxonomies = useMutation(api.onboarding.setUserTaxonomies);
  const saveDraftTaxonomies = useMutation(api.onboarding.saveDraftTaxonomies);
  const complete = useMutation(api.onboarding.complete);

  // Steps: 0 welcome, 1 details, 2 taxonomies
  const [step, setLocalStep] = useState<number>(0);

  useEffect(() => {
    if (!status) return; // still loading
    if (status.completed) {
      router.replace("/" + locale);
      return;
    }
    if (status.currentStep === "welcome") setLocalStep(0);
    else if (status.currentStep === "details") setLocalStep(1);
    else if (status.currentStep === "taxonomies") setLocalStep(2);
  }, [status, router, locale]);

  // Load existing draft values to prefill the form
  useEffect(() => {
    if (!draft) return;
    if (draft.firstNameAr) setFirstNameAr(draft.firstNameAr);
    if (draft.lastNameAr) setLastNameAr(draft.lastNameAr);
    if (draft.firstNameEn) setFirstNameEn(draft.firstNameEn);
    if (draft.lastNameEn) setLastNameEn(draft.lastNameEn);
    if (draft.gender) setGender(draft.gender);
    if (draft.region) setRegion(draft.region);
    if (draft.city) setCity(draft.city);
    if (draft.draftSkillIds)
      setSelectedSkills(draft.draftSkillIds.map((s) => s as unknown as string));
    if (draft.draftInterestIds)
      setSelectedInterests(
        draft.draftInterestIds.map((i) => i as unknown as string),
      );
  }, [draft]);

  const progressVal = useMemo(() => ((step + 1) / 3) * 100, [step]);

  // Basic details form state
  const [firstNameAr, setFirstNameAr] = useState<string>("");
  const [lastNameAr, setLastNameAr] = useState<string>("");
  const [firstNameEn, setFirstNameEn] = useState<string>("");
  const [lastNameEn, setLastNameEn] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [city, setCity] = useState<string>("");
  const [region, setRegion] = useState<string>("");

  // Region/City mapping per requirement
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
    if (!region) return [] as { id: string; label: string }[];
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
    const list = regionCityMap[region] ?? [];
    return list.map((c) => ({
      id: c,
      label: locale === "ar" ? (cityAr[region]?.[c] ?? c) : c,
    }));
  }, [region, regionCityMap, locale]);

  // Taxonomy selections
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const canNextFromDetails =
    firstNameAr.trim() &&
    lastNameAr.trim() &&
    firstNameEn.trim() &&
    lastNameEn.trim() &&
    gender &&
    city &&
    region
      ? true
      : false;
  const canComplete = selectedSkills.length > 0 && selectedInterests.length > 0;

  const goNext = async () => {
    if (step === 0) {
      await setStep({ step: "details" });
      setLocalStep(1);
      return;
    }
    if (step === 1 && canNextFromDetails) {
      // Save only to onboarding draft here
      await saveDraftDetails({
        firstNameAr,
        lastNameAr,
        firstNameEn,
        lastNameEn,
        gender: gender as "male" | "female",
        city,
        region,
      });
      await setStep({ step: "taxonomies" });
      setLocalStep(2);
      return;
    }
    if (step === 2 && canComplete) {
      // On finish, persist details to user tables and taxonomies to user
      await saveDetails({
        firstNameAr,
        lastNameAr,
        firstNameEn,
        lastNameEn,
        gender: gender as "male" | "female",
        city,
        region,
        locale,
      });
      // Cast strings to Ids for Convex client
      await setTaxonomies({
        skillIds: selectedSkills.map((s) => s as unknown as Id<"skills">),
        interestIds: selectedInterests.map(
          (i) => i as unknown as Id<"interests">,
        ),
      });
      await complete({});
      router.replace("/" + locale);
    }
  };

  const primaryCta = step < 2 ? t("next") : t("finish");

  const goBack = async (): Promise<void> => {
    if (step === 2) {
      await setStep({ step: "details" });
      setLocalStep(1);
      return;
    }
    if (step === 1) {
      await setStep({ step: "welcome" });
      setLocalStep(0);
    }
  };

  return (
    <main className="bg-background text-foreground min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-5">
          <LogoIcon />
          <div className="text-lg font-semibold">{t("brand")}</div>
        </div>
        <LanguageSwitcher />
      </header>
      <section className="mx-auto w-full max-w-3xl px-4 pb-12">
        <div className="mb-6">
          <Progress value={progressVal} />
          <p className="mt-2 text-sm opacity-80">
            {t("stepOf", { step: step + 1, total: 3 })}
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl border p-6 shadow-xl">
          {step === 0 && (
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-bold">{t("welcomeTitle")}</h1>
              <p className="opacity-80">{t("welcomeBody")}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">{t("basicDetails")}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm opacity-80">
                    {t("firstNameAr")}
                  </label>
                  <input
                    className="bg-background w-full rounded-lg border px-3 py-2 outline-none"
                    value={firstNameAr}
                    onChange={(e) => setFirstNameAr(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm opacity-80">
                    {t("lastNameAr")}
                  </label>
                  <input
                    className="bg-background w-full rounded-lg border px-3 py-2 outline-none"
                    value={lastNameAr}
                    onChange={(e) => setLastNameAr(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm opacity-80">
                    {t("firstNameEn")}
                  </label>
                  <input
                    className="bg-background w-full rounded-lg border px-3 py-2 outline-none"
                    value={firstNameEn}
                    onChange={(e) => setFirstNameEn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm opacity-80">
                    {t("lastNameEn")}
                  </label>
                  <input
                    className="bg-background w-full rounded-lg border px-3 py-2 outline-none"
                    value={lastNameEn}
                    onChange={(e) => setLastNameEn(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm opacity-80">
                    {t("region")}
                  </label>
                  <BasicDropdown
                    label={t("selectRegion")}
                    items={regions}
                    selectedId={region}
                    onChange={(i) => {
                      setRegion(String(i.id));
                      setCity("");
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm opacity-80">
                    {t("city")}
                  </label>
                  <BasicDropdown
                    label={t("selectCity")}
                    items={cities}
                    selectedId={city}
                    onChange={(i) => setCity(String(i.id))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm opacity-80">
                    {t("gender")}
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="gender"
                        className="accent-primary"
                        checked={gender === "male"}
                        onChange={() => setGender("male")}
                      />
                      <span>{t("male")}</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="gender"
                        className="accent-primary"
                        checked={gender === "female"}
                        onChange={() => setGender("female")}
                      />
                      <span>{t("female")}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">{t("skillsInterests")}</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-lg font-medium">
                    {t("selectSkillAtLeastOne")}
                  </h3>
                  <TaxonomySelector
                    kind="skill"
                    onChange={({ selectedIds }) => {
                      setSelectedSkills(selectedIds);
                      void saveDraftTaxonomies({
                        skillIds: selectedIds.map(
                          (s) => s as unknown as Id<"skills">,
                        ),
                        interestIds: selectedInterests.map(
                          (i) => i as unknown as Id<"interests">,
                        ),
                      });
                    }}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-medium">
                    {t("selectInterestAtLeastOne")}
                  </h3>
                  <TaxonomySelector
                    kind="interest"
                    onChange={({ selectedIds }) => {
                      setSelectedInterests(selectedIds);
                      void saveDraftTaxonomies({
                        skillIds: selectedSkills.map(
                          (s) => s as unknown as Id<"skills">,
                        ),
                        interestIds: selectedIds.map(
                          (i) => i as unknown as Id<"interests">,
                        ),
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <div>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => void goBack()}
                  className="hover:bg-accent hover:text-accent-foreground inline-flex items-center rounded-md border px-6 py-2 font-medium"
                >
                  {t("back")}
                </button>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={
                  (step === 1 && !canNextFromDetails) ||
                  (step === 2 && !canComplete)
                }
                className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-6 py-2 font-medium shadow hover:opacity-90 disabled:opacity-50"
              >
                {primaryCta}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
