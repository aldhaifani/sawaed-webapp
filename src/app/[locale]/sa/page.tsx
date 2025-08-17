import { type ReactElement } from "react";
import { getTranslations } from "next-intl/server";

export default async function SuperAdminPage(): Promise<ReactElement> {
  const tRoles = await getTranslations("roles");
  const tCommon = await getTranslations("common");
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{tRoles("superAdmin")}</h1>
        <p className="text-muted-foreground">{tCommon("welcome")}</p>
      </div>
    </main>
  );
}
