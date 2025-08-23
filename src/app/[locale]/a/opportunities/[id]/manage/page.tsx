"use client";

import type { ReactElement } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users } from "lucide-react";

// Reuse existing implementations to avoid logic duplication
import { OpportunityEditForm } from "@/components/admin/OpportunityEditForm";
import { AdminEventApplications } from "@/components/admin/AdminEventApplications";

export default function AdminManageOpportunityPage(): ReactElement {
  const t = useTranslations("opportunities.manage");
  const locale = (useLocale() as "ar" | "en") ?? "en";

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
              {t("title", { defaultMessage: "Manage Opportunity" })}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("subtitle", {
                defaultMessage: "Edit details and review applications",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/${locale}/a/opportunities`}>
                {t("back", { defaultMessage: "Back to list" })}
              </Link>
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                <span>{t("tabs.header", { defaultMessage: "Manage" })}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="opportunity"
              className="w-full"
              dir={locale === "ar" ? "rtl" : "ltr"}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="opportunity" className="gap-1">
                  <Settings className="size-4" />
                  {t("tabs.opportunity", { defaultMessage: "Opportunity" })}
                </TabsTrigger>
                <TabsTrigger value="applications" className="gap-1">
                  <Users className="size-4" />
                  {t("tabs.applications", { defaultMessage: "Applications" })}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="opportunity">
                {/* Embed edit form component */}
                <OpportunityEditForm />
              </TabsContent>

              <TabsContent value="applications">
                {/* Embedded admin applications */}
                <AdminEventApplications />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
