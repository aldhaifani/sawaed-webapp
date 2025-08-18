"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function YouthHomePage(): ReactElement {
  const tCommon = useTranslations("common");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          {tCommon("appName")}
        </h1>
        <LogoutButton />
      </div>
    </main>
  );
}
