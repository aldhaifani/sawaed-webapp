"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export type EducationItem = {
  readonly institution: string;
  readonly degree: string;
  readonly field?: string;
  readonly start?: string; // string input for year
  readonly end?: string; // string input for year or "Present"
  readonly description?: string;
};

export type EduFormProps = {
  readonly defaults?: Partial<EducationItem>;
  readonly onCancel: () => void;
  readonly onSubmit: (payload: {
    institution: string;
    degree: string;
    field?: string;
    startYear?: number;
    endYear?: number | "Present";
    description?: string;
  }) => Promise<void>;
};

export function EduForm({
  defaults,
  onCancel,
  onSubmit,
}: EduFormProps): ReactElement {
  const t = useTranslations("profile");
  const [institution, setInstitution] = useState<string>(
    defaults?.institution ?? "",
  );
  const [degree, setDegree] = useState<string>(defaults?.degree ?? "");
  const [field, setField] = useState<string>(defaults?.field ?? "");
  const [start, setStart] = useState<string>(defaults?.start ?? "");
  const [end, setEnd] = useState<string>(defaults?.end ?? "");
  const [description, setDescription] = useState<string>(
    defaults?.description ?? "",
  );

  const handleSubmit = useCallback(async () => {
    const payload = {
      institution,
      degree,
      field: field || undefined,
      startYear: start ? Number(start) : undefined,
      endYear:
        end.trim().toLowerCase() === t("present").toLowerCase()
          ? "Present"
          : end
            ? Number(end)
            : undefined,
      description: description || undefined,
    } as const;
    await onSubmit(payload);
  }, [institution, degree, field, start, end, description, onSubmit, t]);

  return (
    <div className="space-y-3 px-4 pb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="institution">{t("form.institution")}</Label>
          <Input
            id="institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="degree">{t("form.degree")}</Label>
          <Input
            id="degree"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="field">{t("form.field")}</Label>
          <Input
            id="field"
            value={field}
            onChange={(e) => setField(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start">{t("form.startYear")}</Label>
          <Input
            id="start"
            inputMode="numeric"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">{t("form.endYearOrPresent")}</Label>
          <Input
            id="end"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder={t("form.egYearOrPresent")}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="desc">{t("form.description")}</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button variant="ghost" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        </DialogClose>
        <Button className="gap-2" onClick={handleSubmit}>
          <CheckCircle2 className="size-4" /> {t("actions.save")}
        </Button>
      </div>
    </div>
  );
}
