"use client";

import type { ReactElement } from "react";
import { useId } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";

export interface DateTimeFieldProps {
  readonly label: string;
  readonly valueText: string;
  readonly valueMs?: number;
  readonly onChangeMs: (valueMs?: number) => void;
  readonly placeholder?: string;
  readonly id?: string;
}

export function DateTimeField(props: DateTimeFieldProps): ReactElement {
  const { label, valueText, valueMs, onChangeMs, placeholder, id } = props;
  const autoId = useId();
  const inputId: string = id ?? autoId;

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input
          id={inputId}
          readOnly
          value={valueText}
          placeholder={placeholder ?? "YYYY-MM-DD HH:mm"}
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Select ${label.toLowerCase()}`}
            >
              <CalendarDays className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{label}</DialogTitle>
            </DialogHeader>
            <DateTimePicker
              label={label}
              valueMs={valueMs}
              onChange={onChangeMs}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
