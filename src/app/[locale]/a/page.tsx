import { type ReactElement } from "react";
import { getTranslations } from "next-intl/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function AdminPage(): Promise<ReactElement> {
  const tRoles = await getTranslations("roles");
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{tRoles("admin")}</h1>
        <LogoutButton />
      </div>
    </main>
  );
}
