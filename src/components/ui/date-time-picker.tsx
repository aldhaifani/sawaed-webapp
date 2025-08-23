"use client";

import type { ReactElement } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { ClockIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DateTimePickerProps {
  readonly label?: string;
  readonly valueMs?: number;
  readonly onChange: (valueMs?: number) => void;
  readonly id?: string;
}

/**
 * DateTimePicker renders a DayPicker calendar with a time input.
 * It emits a combined timestamp in milliseconds using the local timezone.
 */
export function DateTimePicker(props: DateTimePickerProps): ReactElement {
  const { label, valueMs, onChange, id } = props;
  const autoId = useId();
  const inputId: string = id ?? autoId;

  const initialDate: Date | undefined = useMemo(() => {
    return typeof valueMs === "number" ? new Date(valueMs) : undefined;
  }, [valueMs]);

  const [date, setDate] = useState<Date | undefined>(initialDate ?? new Date());
  const [time, setTime] = useState<string>(() =>
    formatTime(initialDate ?? new Date()),
  );

  // Keep internal state in sync when valueMs changes from outside
  useEffect(() => {
    if (typeof valueMs === "number") {
      const d = new Date(valueMs);
      setDate(d);
      setTime(formatTime(d));
    }
  }, [valueMs]);

  function emitChange(nextDate: Date | undefined, nextTime: string): void {
    if (!nextDate) {
      onChange(undefined);
      return;
    }
    const [hh, mm, ss] = normalizeTime(nextTime);
    const combined = new Date(nextDate);
    combined.setHours(hh, mm, ss, 0);
    const ms = combined.getTime();
    if (Number.isFinite(ms)) onChange(ms);
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-fit rounded-md border">
        <Calendar
          mode="single"
          className="p-2"
          selected={date}
          onSelect={(d) => {
            setDate(d ?? undefined);
            emitChange(d ?? undefined, time);
          }}
        />
        <div className="border-t p-3">
          <div className="flex items-center gap-3">
            {label ? (
              <Label htmlFor={inputId} className="text-xs">
                {label}
              </Label>
            ) : null}
            <div className="relative grow">
              <Input
                id={inputId}
                type="time"
                step="1"
                value={time}
                onChange={(e) => {
                  const v = e.target.value;
                  setTime(v);
                  emitChange(date, v);
                }}
                className="peer appearance-none ps-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <ClockIcon size={16} aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeTime(value: string): [number, number, number] {
  const parts = value.split(":");
  const hh = clampInt(parts[0] ?? "00", 0, 23);
  const mm = clampInt(parts[1] ?? "00", 0, 59);
  const ss = clampInt(parts[2] ?? "00", 0, 59);
  return [hh, mm, ss];
}

function clampInt(v: string, min: number, max: number): number {
  const n = Math.max(min, Math.min(max, Number.parseInt(v || "0", 10)));
  return Number.isFinite(n) ? n : min;
}
