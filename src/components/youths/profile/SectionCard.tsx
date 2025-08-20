"use client";

import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Pen, Plus } from "lucide-react";

export type SectionCardProps = {
  readonly title: string;
  readonly actionLabel?: "Add" | "Edit";
  readonly onAction?: () => void;
  readonly children: React.ReactNode;
};

export function SectionCard({
  title,
  actionLabel,
  onAction,
  children,
}: SectionCardProps): ReactElement {
  return (
    <section className="bg-card rounded-xl border shadow-sm">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        {actionLabel ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={onAction}
          >
            {actionLabel === "Add" ? (
              <Plus className="size-3" />
            ) : actionLabel === "Edit" ? (
              <Pen className="size-3" />
            ) : null}
            {actionLabel}
          </Button>
        ) : null}
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
