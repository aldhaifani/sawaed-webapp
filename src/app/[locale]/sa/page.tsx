"use client";

import { type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function SuperAdminPage(): ReactElement {
  const tRoles = useTranslations("roles");
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{tRoles("superAdmin")}</h1>
        <LogoutButton />
      </div>
    </main>
  );
}
