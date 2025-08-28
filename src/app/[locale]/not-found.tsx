"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardPathForRoleLocale, type Role } from "@/shared/rbac";

export default function NotFoundPage(): ReactElement {
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "ar" ? "ar" : "en";
  const t = useTranslations("notFound");
  const router = useRouter();
  const me = useQuery(api.rbac.currentUser, {});

  const homeHref = useMemo(() => {
    const role: Role = me?.role ?? "YOUTH";
    return getDashboardPathForRoleLocale(role, locale);
  }, [locale, me?.role]);

  const title = t("title");
  const desc = t("desc");
  const cta = t("cta");

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-2xl font-bold">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 text-sm">{desc}</p>
            <Button onClick={() => router.replace(homeHref)}>{cta}</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
