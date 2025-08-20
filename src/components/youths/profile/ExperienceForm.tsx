"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/BasicDialog";
import { CheckCircle2 } from "lucide-react";

export type ExperiencePayload = {
  readonly title: string;
  readonly organization: string;
  readonly startDate?: number;
  readonly endDate?: number;
  readonly description?: string;
};

export type ExperienceFormProps = {
  readonly defaults?: Partial<ExperiencePayload>;
  readonly onCancel: () => void;
  readonly onSubmit: (payload: ExperiencePayload) => Promise<void>;
};

export function ExperienceForm({
  defaults,
  onCancel,
  onSubmit,
}: ExperienceFormProps): ReactElement {
  const [title, setTitle] = useState<string>(defaults?.title ?? "");
  const [organization, setOrganization] = useState<string>(
    defaults?.organization ?? "",
  );
  const [start, setStart] = useState<string>(
    defaults?.startDate
      ? String(new Date(defaults.startDate).getFullYear())
      : "",
  );
  const [end, setEnd] = useState<string>(
    typeof defaults?.endDate === "number"
      ? String(new Date(defaults.endDate).getFullYear())
      : "",
  );
  const [description, setDescription] = useState<string>(
    defaults?.description ?? "",
  );

  const toYear = (value: string): number | undefined => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0
      ? new Date(n, 0, 1).getTime()
      : undefined;
  };

  const handleSubmit = useCallback(async () => {
    const payload: ExperiencePayload = {
      title,
      organization,
      startDate: toYear(start),
      endDate: toYear(end),
      description: description || undefined,
    };
    await onSubmit(payload);
  }, [title, organization, start, end, description, onSubmit]);

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="e-title">Title</Label>
          <Input
            id="e-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Volunteer Mentor"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="e-org">Organization</Label>
          <Input
            id="e-org"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Local NGO"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="e-start">Start Year</Label>
          <Input
            id="e-start"
            inputMode="numeric"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="e.g. 2023"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="e-end">End Year</Label>
          <Input
            id="e-end"
            inputMode="numeric"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="e.g. 2024"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="e-desc">Description</Label>
          <Input
            id="e-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <DialogClose>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          className="gap-2"
          onClick={handleSubmit}
          disabled={!title.trim() || !organization.trim()}
        >
          <CheckCircle2 className="size-4" /> Save
        </Button>
      </div>
    </div>
  );
}
