"use client";

/**
 * SkillSelect component
 *
 * Fetches AI skills via Convex (`aiAssessments.getSkills`) and renders a
 * bilingual dropdown using shadcn/ui Select. Emits the selected AI Skill ID.
 */

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SkillItem {
  readonly _id: Id<"aiSkills">;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly category?: string;
  readonly definitionEn?: string;
  readonly definitionAr?: string;
  readonly levels?: readonly {
    readonly level: number;
    readonly nameEn: string;
    readonly nameAr: string;
  }[];
  readonly relatedSkills?: readonly {
    readonly _id: Id<"skills">;
    readonly nameEn: string;
    readonly nameAr: string;
  }[];
  readonly relatedInterests?: readonly {
    readonly _id: Id<"interests">;
    readonly nameEn: string;
    readonly nameAr: string;
  }[];
}

type SkillServer = {
  readonly _id: Id<"aiSkills">;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly category?: string;
  readonly definitionEn?: string;
  readonly definitionAr?: string;
  readonly levels?: readonly {
    readonly level: number;
    readonly nameEn: string;
    readonly nameAr: string;
  }[];
  readonly relatedSkills?: readonly {
    readonly _id: Id<"skills">;
    readonly nameEn: string;
    readonly nameAr: string;
  }[];
  readonly relatedInterests?: readonly {
    readonly _id: Id<"interests">;
    readonly nameEn: string;
    readonly nameAr: string;
  }[];
};

interface SkillSelectProps {
  /** Currently selected aiSkill id */
  readonly value?: Id<"aiSkills">;
  /** Placeholder text when nothing is selected */
  readonly placeholder?: string;
  /** Invoked when user selects a skill */
  readonly onChange: (args: { value: Id<"aiSkills"> }) => void;
  /** Optional className for the trigger */
  readonly className?: string;
}

/**
 * Renders a controlled dropdown of AI skills with loading/empty states.
 */
export function SkillSelect({
  value,
  placeholder = "Select a skill",
  onChange,
  className,
}: SkillSelectProps): ReactElement {
  const locale = (useLocale() as "ar" | "en") ?? "ar";
  const skills = useQuery(api.aiAssessments.getSkills, {});

  const items: readonly SkillItem[] = useMemo(() => {
    if (!skills) return [] as const;
    return (skills as readonly SkillServer[]).map((s) => ({
      _id: s._id,
      nameEn: s.nameEn,
      nameAr: s.nameAr,
      category: s.category,
      definitionEn: s.definitionEn,
      definitionAr: s.definitionAr,
      levels: s.levels,
      relatedSkills: s.relatedSkills,
      relatedInterests: s.relatedInterests,
    }));
  }, [skills]);

  const isLoading: boolean = skills === undefined;
  const isEmpty: boolean = !isLoading && items.length === 0;

  const renderLabel = (it: SkillItem): string => {
    const name = locale === "ar" ? it.nameAr : it.nameEn;
    const count = it.levels?.length ?? 0;
    const levelsWord = (() => {
      if (locale === "ar") {
        if (count === 1) return "مستوى";
        if (count === 2) return "مستويان";
        return "مستويات";
      }
      return count === 1 ? "level" : "levels";
    })();
    return `${name} (${count} ${levelsWord})`;
  };
  const renderDescription = (it: SkillItem): string | undefined => {
    const desc = locale === "ar" ? it.definitionAr : it.definitionEn;
    if (!desc) return undefined;
    const trimmed = desc.trim();
    return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
  };

  return (
    <Select
      value={value as unknown as string | undefined}
      onValueChange={(val) => onChange({ value: val as Id<"aiSkills"> })}
      disabled={isLoading || isEmpty}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <SelectTrigger className={cn("min-h-10", className)}>
        <SelectValue
          placeholder={
            isLoading
              ? locale === "ar"
                ? "جاري التحميل..."
                : "Loading..."
              : isEmpty
                ? locale === "ar"
                  ? "لا توجد مهارات"
                  : "No skills"
                : placeholder
          }
        />
      </SelectTrigger>
      <SelectContent
        className="max-h-72 w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] overflow-x-hidden overflow-y-auto"
        sideOffset={4}
        collisionPadding={12}
      >
        {isLoading ? (
          <SelectPrimitive.Item
            value="loading"
            disabled
            className="px-2 py-1.5 text-sm opacity-70"
          >
            <SelectPrimitive.ItemText>
              {locale === "ar" ? "جاري التحميل..." : "Loading..."}
            </SelectPrimitive.ItemText>
          </SelectPrimitive.Item>
        ) : isEmpty ? (
          <SelectPrimitive.Item
            value="empty"
            disabled
            className="px-2 py-1.5 text-sm opacity-70"
          >
            <SelectPrimitive.ItemText>
              {locale === "ar" ? "لا توجد مهارات متاحة" : "No skills available"}
            </SelectPrimitive.ItemText>
          </SelectPrimitive.Item>
        ) : (
          items.map((it) => (
            <SelectPrimitive.Item
              key={String(it._id)}
              value={it._id as unknown as string}
              className="focus:bg-accent focus:text-accent-foreground relative w-full cursor-default rounded-sm px-2 py-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <div className="flex flex-col gap-1">
                {/* Only this text is mirrored to trigger */}
                <SelectPrimitive.ItemText>
                  <span className="text-foreground font-medium">
                    {renderLabel(it)}
                  </span>
                </SelectPrimitive.ItemText>
                {/* Extra rich content stays only in dropdown */}
                {renderDescription(it) ? (
                  <p className="text-muted-foreground text-xs leading-snug break-words">
                    {renderDescription(it)}
                  </p>
                ) : null}
                {(it.relatedSkills?.length ?? 0) > 0 ||
                (it.relatedInterests?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(it.relatedSkills ?? []).map((rs) => (
                      <Badge
                        key={`rs-${String(rs._id)}`}
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {locale === "ar" ? rs.nameAr : rs.nameEn}
                      </Badge>
                    ))}
                    {(it.relatedInterests ?? []).map((ri) => (
                      <Badge
                        key={`ri-${String(ri._id)}`}
                        variant="outline"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {locale === "ar" ? ri.nameAr : ri.nameEn}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </SelectPrimitive.Item>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
