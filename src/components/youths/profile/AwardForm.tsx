"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

export type AwardPayload = {
  readonly title: string;
  readonly issuer?: string;
  readonly year?: number;
};

export type AwardFormProps = {
  readonly defaults?: Partial<AwardPayload>;
  readonly onCancel: () => void;
  readonly onSubmit: (payload: AwardPayload) => Promise<void>;
};

export function AwardForm({
  defaults,
  onCancel,
  onSubmit,
}: AwardFormProps): ReactElement {
  const t = useTranslations("profile");
  const [title, setTitle] = useState<string>(defaults?.title ?? "");
  const [issuer, setIssuer] = useState<string>(defaults?.issuer ?? "");
  const [year, setYear] = useState<string>(
    defaults?.year ? String(defaults.year) : "",
  );

  const handleSubmit = useCallback(async () => {
    const payload: AwardPayload = {
      title,
      issuer: issuer || undefined,
      year: year ? Number(year) : undefined,
    };
    await onSubmit(payload);
  }, [title, issuer, year, onSubmit]);

  return (
    <div className="space-y-3 px-4 pb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="a-title">{t("form.title")}</Label>
          <Input
            id="a-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-issuer">{t("form.issuer")}</Label>
          <Input
            id="a-issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-year">{t("form.year")}</Label>
          <Input
            id="a-year"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder={t("form.egYear2")}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button variant="ghost" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        </DialogClose>
        <Button
          className="gap-2"
          onClick={handleSubmit}
          disabled={!title.trim()}
        >
          <CheckCircle2 className="size-4" /> {t("actions.save")}
        </Button>
      </div>
    </div>
  );
}
