"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Placeholder Chat Page
 * Shows selected skill id via query (?skill=) and a simple message.
 * The real chat UI will be implemented in a later task.
 */
export default function ChatPlaceholderPage(): ReactElement {
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "ar" ? "ar" : "en";
  const params = useSearchParams();
  const skill = params.get("skill") ?? "";

  const title = useMemo(
    () =>
      locale === "ar"
        ? "محادثة التقييم (قريبًا)"
        : "Assessment Chat (Coming Soon)",
    [locale],
  );

  return (
    <main className="bg-background min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <h1 className="text-foreground mb-6 text-2xl font-bold">{title}</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "ar" ? "المهارة المختارة" : "Selected Skill"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {locale === "ar" ? "المعرف:" : "ID:"}{" "}
              <span className="font-mono">{skill}</span>
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {locale === "ar"
                ? "سيتم عرض واجهة محادثة الذكاء الاصطناعي هنا في المهام القادمة."
                : "The AI chat interface will be implemented here in upcoming tasks."}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
