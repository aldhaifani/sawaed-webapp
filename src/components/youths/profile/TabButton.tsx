"use client";

import type { ReactElement } from "react";
import React from "react";

/**
 * Tab button used in the Youth Profile sidebar to switch tabs.
 */
export type TabButtonProps = {
  readonly isActive: boolean;
  readonly onClick: () => void;
  readonly icon: React.ComponentType<{ className?: string; size?: number }>;
  readonly label: string;
};

export function TabButton({
  isActive,
  onClick,
  icon: Icon,
  label,
}: TabButtonProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-secondary text-foreground border-border"
          : "bg-background text-muted-foreground hover:bg-muted border-transparent"
      }`}
      aria-pressed={isActive}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}
