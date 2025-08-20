"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/BasicDialog";
import { CheckCircle2 } from "lucide-react";

export type ProjectPayload = {
  readonly title: string;
  readonly period?: string;
  readonly description?: string;
  readonly url?: string;
};

export type ProjectFormProps = {
  readonly defaults?: Partial<ProjectPayload>;
  readonly onCancel: () => void;
  readonly onSubmit: (payload: ProjectPayload) => Promise<void>;
};

export function ProjectForm({
  defaults,
  onCancel,
  onSubmit,
}: ProjectFormProps): ReactElement {
  const [title, setTitle] = useState<string>(defaults?.title ?? "");
  const [period, setPeriod] = useState<string>(defaults?.period ?? "");
  const [url, setUrl] = useState<string>(defaults?.url ?? "");
  const [description, setDescription] = useState<string>(
    defaults?.description ?? "",
  );

  const handleSubmit = useCallback(async () => {
    const payload: ProjectPayload = {
      title,
      period: period || undefined,
      url: url || undefined,
      description: description || undefined,
    };
    await onSubmit(payload);
  }, [title, period, url, description, onSubmit]);

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="p-title">Title</Label>
          <Input
            id="p-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-period">Period</Label>
          <Input
            id="p-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="e.g. 2023 – 2024"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-url">URL</Label>
          <Input
            id="p-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="p-desc">Description</Label>
          <Input
            id="p-desc"
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
          disabled={!title.trim()}
        >
          <CheckCircle2 className="size-4" /> Save
        </Button>
      </div>
    </div>
  );
}
