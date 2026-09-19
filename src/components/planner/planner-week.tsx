"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PlannerViewToggle } from "@/components/planner/view-toggle";
import { Button } from "@/components/ui/button";
import {
  addDays,
  BLOCK_CATEGORIES,
  mondayOf,
  parseISODate,
  toISODate,
  type TimeBlock,
} from "@/lib/planner-constants";
import { cn } from "@/lib/utils";

const rangeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});
const yearFormat = new Intl.DateTimeFormat("en-GB", { year: "numeric" });
const headFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

// Hours:minutes, no seconds — week totals don't need that resolution.
function formatHM(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export function PlannerWeek({
  date,
  blocks,
}: {
  date: string;
  blocks: TimeBlock[];
}) {
  const router = useRouter();
  const monday = mondayOf(date);
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const today = toISODate(new Date());

  // Tick while a timer in this week runs, so the week view counts live too.
  const running = blocks.some((b) => b.started_at !== null);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  function actualSeconds(block: TimeBlock) {
    const live = block.started_at
      ? Math.max(0, (now - Date.parse(block.started_at)) / 1000)
      : 0;
    return block.actual_seconds + live;
  }

  // seconds[category][dateIso]
  const seconds = new Map<string, Map<string, number>>();
  const runningCell = new Set<string>();
  for (const block of blocks) {
    const byDay = seconds.get(block.category) ?? new Map<string, number>();
    byDay.set(block.date, (byDay.get(block.date) ?? 0) + actualSeconds(block));
    seconds.set(block.category, byDay);
    if (block.started_at) runningCell.add(`${block.category}:${block.date}`);
  }

  const cell = (category: string, day: string) =>
    seconds.get(category)?.get(day) ?? 0;
  const categoryTotal = (category: string) =>
    days.reduce((sum, day) => sum + cell(category, day), 0);
  const dayTotal = (day: string) =>
    BLOCK_CATEGORIES.reduce((sum, c) => sum + cell(c.key, day), 0);

  // Planned = the fixed plan × 6 days, whether or not a day was opened.
  const plannedWeekHours = (perDayMinutes: number) => (perDayMinutes * 6) / 60;
  const weekActual = days.reduce((sum, day) => sum + dayTotal(day), 0);
  const weekPlannedHours = BLOCK_CATEGORIES.reduce(
    (sum, c) => sum + plannedWeekHours(c.plannedMinutes),
    0,
  );

  const saturday = days[5];
  const rangeLabel = `${rangeFormat.format(parseISODate(monday))} – ${rangeFormat.format(parseISODate(saturday))} ${yearFormat.format(parseISODate(saturday))}`;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous week"
          onClick={() => router.push(`/planner?d=${addDays(date, -7)}&view=week`)}
        >
          <ChevronLeft />
        </Button>
        <span className="font-medium">{rangeLabel}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next week"
          onClick={() => router.push(`/planner?d=${addDays(date, 7)}&view=week`)}
        >
          <ChevronRight />
        </Button>
        {mondayOf(today) !== monday && (
          <Button
            variant="ghost"
            onClick={() => router.push(`/planner?d=${today}&view=week`)}
          >
            This week
          </Button>
        )}
        <div className="ml-auto">
          <PlannerViewToggle date={date} active="week" />
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-xl p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-secondary text-neutral-tertiary">
              <th className="py-2 pr-2 text-left font-medium">Category</th>
              {days.map((day) => (
                <th key={day} className="px-2 py-2 text-right font-medium">
                  <Link
                    href={`/planner?d=${day}`}
                    className={cn(
                      "hover:text-neutral-primary",
                      day === today && "text-brand-primary",
                    )}
                  >
                    {headFormat.format(parseISODate(day))}{" "}
                    {parseISODate(day).getDate()}
                  </Link>
                </th>
              ))}
              <th className="px-2 py-2 text-right font-medium">
                Total / planned
              </th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {BLOCK_CATEGORIES.map((category) => {
              const total = categoryTotal(category.key);
              const plannedHours = plannedWeekHours(category.plannedMinutes);
              const reached = total >= plannedHours * 3600;
              return (
                <tr
                  key={category.key}
                  className="border-b border-neutral-secondary"
                >
                  <td className="py-2 pr-2">{category.label}</td>
                  {days.map((day) => {
                    const value = cell(category.key, day);
                    const isRunning = runningCell.has(`${category.key}:${day}`);
                    return (
                      <td
                        key={day}
                        className={cn(
                          "px-2 py-2 text-right tabular-nums",
                          isRunning
                            ? "text-brand-primary"
                            : value === 0 && "text-neutral-tertiary",
                        )}
                      >
                        {value > 0 || isRunning ? formatHM(value) : "–"}
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "px-2 py-2 text-right tabular-nums",
                      reached && "text-success",
                    )}
                  >
                    {formatHM(total)} / {plannedHours}h
                  </td>
                  <td className="py-2 pl-2">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-neutral-secondary">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          reached ? "bg-success" : "bg-brand-primary",
                        )}
                        style={{
                          width: `${Math.min(100, (total / (plannedHours * 3600)) * 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="font-medium">
              <td className="py-2 pr-2">Total</td>
              {days.map((day) => {
                const value = dayTotal(day);
                return (
                  <td
                    key={day}
                    className={cn(
                      "px-2 py-2 text-right tabular-nums",
                      value === 0 && "text-neutral-tertiary",
                    )}
                  >
                    {value > 0 ? formatHM(value) : "–"}
                  </td>
                );
              })}
              <td
                className={cn(
                  "px-2 py-2 text-right tabular-nums",
                  weekActual >= weekPlannedHours * 3600 && "text-success",
                )}
              >
                {formatHM(weekActual)} / {weekPlannedHours}h
              </td>
              <td className="py-2" />
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-neutral-tertiary">
        Planned is the fixed plan (2h + 6h + 2h) × 6 days. Click a day header
        to open that day.
      </p>
      </div>
    </main>
  );
}
