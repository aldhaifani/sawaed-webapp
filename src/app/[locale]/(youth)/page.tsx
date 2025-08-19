"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { TaxonomySelector } from "@/components/taxonomies/taxonomy-selector";
import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

export default function YouthHomePage(): ReactElement {
  const tCommon = useTranslations("common");
  const tTax = useTranslations("superadmin.taxonomies");
  const locale = (useLocale() as "ar" | "en") ?? "ar";
  const router = useRouter();
  const status = useQuery(api.onboarding.getStatus, {});
  useEffect(() => {
    if (!status) return; // loading
    if (!status.completed) {
      router.replace(`/${locale}/onboarding`);
    }
  }, [status, router, locale]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          {tCommon("appName")}
        </h1>
        <LogoutButton />
        <div className="w-full rounded-lg bg-white/10 p-4">
          <h2 className="mb-3 text-xl font-semibold">{tTax("skills")}</h2>
          <TaxonomySelector
            kind="skill"
            onChange={({ selectedIds }) => {
              // TODO: Persist selections in a follow-up (userTaxonomy convex mutations)
              // For now, no-op integration to avoid breaking flows
              console.debug("Selected skills:", selectedIds);
            }}
          />
        </div>
        <div className="w-full rounded-lg bg-white/10 p-4">
          <h2 className="mb-3 text-xl font-semibold">{tTax("interests")}</h2>
          <TaxonomySelector
            kind="interest"
            onChange={({ selectedIds }) => {
              // TODO: Persist selections in a follow-up (userTaxonomy convex mutations)
              console.debug("Selected interests:", selectedIds);
            }}
          />
        </div>
      </div>
    </main>
  );
}
