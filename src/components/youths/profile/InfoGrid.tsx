"use client";

import type { ReactElement } from "react";

export type FieldItem = {
  readonly label: string;
  readonly value: string;
};

export function InfoGrid({
  items,
}: {
  items: readonly FieldItem[];
}): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <div key={f.label} className="bg-background rounded-md border p-4">
          <div className="text-muted-foreground text-xs">{f.label}</div>
          <div className="text-foreground mt-1 text-sm font-medium">
            {f.value}
          </div>
        </div>
      ))}
    </div>
  );
}
