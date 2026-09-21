"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover } from "radix-ui";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/*
 * Date + time field in the app's input style. The native datetime-local
 * picker cannot be themed, so the popover is ours: glass-input surface,
 * 2px below the trigger, same width as the trigger, soft ease in.
 * Emits "YYYY-MM-DDTHH:mm" through a hidden input for plain FormData.
 */

const pad = (n: number) => String(n).padStart(2, "0");

function toValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const displayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: pad(h),
  label: pad(h),
}));
const MINUTES = Array.from({ length: 60 }, (_, m) => ({
  value: pad(m),
  label: pad(m),
}));

export function DateTimeField({
  name,
  defaultValue,
  "aria-label": ariaLabel,
}: {
  name: string;
  defaultValue: string;
  "aria-label"?: string;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const selected = React.useMemo(() => new Date(value), [value]);
  const [cursor, setCursor] = React.useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  function pick(day: Date) {
    const next = new Date(day);
    next.setHours(selected.getHours(), selected.getMinutes());
    setValue(toValue(next));
    setCursor(new Date(day.getFullYear(), day.getMonth(), 1));
  }

  function setTime(part: "h" | "m", raw: string) {
    const next = new Date(selected);
    if (part === "h") next.setHours(Number(raw));
    else next.setMinutes(Number(raw));
    setValue(toValue(next));
  }

  // Six Monday-first weeks around the cursor month.
  const offset = (cursor.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const d = new Date(cursor);
    d.setDate(1 - offset + index);
    return d;
  });
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <Popover.Root>
      <input type="hidden" name={name} value={value} />
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "glass-input flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-base px-3 text-sm text-neutral-primary outline-none",
            "hover:border-neutral-primary-hovered",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          <span className="truncate">{displayFormat.format(selected)}</span>
          <CalendarDays className="size-4 shrink-0 text-neutral-tertiary" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={2}
          className={cn(
            "glass-input z-50 w-[var(--radix-popover-trigger-width)] rounded-base p-3",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Previous month"
                onClick={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft />
              </Button>
              <span className="font-medium">{monthFormat.format(cursor)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Next month"
                onClick={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-hairline text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1 text-sm text-neutral-faint">
                  {d}
                </span>
              ))}
              {cells.map((day) => {
                const isSelected = sameDay(day, selected);
                const outside = day.getMonth() !== cursor.getMonth();
                return (
                  <Button
                    key={day.toISOString()}
                    type="button"
                    size="sm"
                    variant={isSelected ? "primary" : "ghost"}
                    onClick={() => pick(day)}
                    className={cn(
                      "px-0",
                      !isSelected && outside && "text-neutral-faint",
                      !isSelected &&
                        !outside &&
                        sameDay(day, today) &&
                        "text-brand-primary",
                    )}
                  >
                    {day.getDate()}
                  </Button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                aria-label="Hour"
                value={pad(selected.getHours())}
                onValueChange={(v) => setTime("h", v)}
                options={HOURS}
              />
              <Select
                aria-label="Minutes"
                value={pad(selected.getMinutes())}
                onValueChange={(v) => setTime("m", v)}
                options={MINUTES}
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="tab"
                size="sm"
                onClick={() => {
                  setValue(toValue(new Date()));
                  setCursor(
                    new Date(today.getFullYear(), today.getMonth(), 1),
                  );
                }}
              >
                Now
              </Button>
              <Popover.Close asChild>
                <Button type="button" size="sm">
                  Done
                </Button>
              </Popover.Close>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
