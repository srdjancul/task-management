"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";

import { PlannerViewToggle } from "@/components/planner/view-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTask,
  deleteTask,
  setBlockDone,
  setBlockPlannedMinutes,
  setTaskDone,
  startBlock,
  stopBlock,
  type BlocksResult,
} from "@/lib/actions/planner";
import {
  addDays,
  BLOCK_CATEGORIES,
  mondayOf,
  parseISODate,
  toISODate,
  type PlannerTask,
  type TimeBlock,
} from "@/lib/planner-constants";
import { cn } from "@/lib/utils";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const stripFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

function formatSeconds(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function PlannerDay({
  date,
  initialBlocks,
  initialTasks,
}: {
  date: string;
  initialBlocks: TimeBlock[];
  initialTasks: PlannerTask[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = React.useState(initialBlocks);
  const [tasks, setTasks] = React.useState(initialTasks);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  // New server data after day navigation → adopt it.
  const [prevKey, setPrevKey] = React.useState(date);
  if (prevKey !== date) {
    setPrevKey(date);
    setBlocks(initialBlocks);
    setTasks(initialTasks);
  }

  React.useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Tick once a second while a timer runs.
  const running = blocks.some((b) => b.started_at !== null);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  function applyBlocksResult(result: BlocksResult, revertTo: TimeBlock[]) {
    if (result.error || !result.blocks) {
      setBlocks(revertTo);
      setNotice(result.error ?? "Something went wrong.");
    } else {
      setBlocks(result.blocks);
    }
  }

  function displayedSeconds(block: TimeBlock) {
    const live = block.started_at
      ? (now - Date.parse(block.started_at)) / 1000
      : 0;
    return block.actual_seconds + live;
  }

  function handleStart(block: TimeBlock) {
    const snapshot = blocks;
    const startedAt = new Date().toISOString();
    // Optimistically stop whatever runs and start this one.
    setBlocks((all) =>
      all.map((b) => {
        if (b.id === block.id)
          return { ...b, started_at: startedAt, status: "in_progress" };
        if (b.started_at) {
          return {
            ...b,
            actual_seconds:
              b.actual_seconds +
              Math.max(0, (Date.now() - Date.parse(b.started_at)) / 1000),
            started_at: null,
          };
        }
        return b;
      }),
    );
    startTransition(async () => {
      applyBlocksResult(await startBlock(block.id, date), snapshot);
    });
  }

  function handleStop(block: TimeBlock) {
    const snapshot = blocks;
    setBlocks((all) =>
      all.map((b) =>
        b.id === block.id
          ? {
              ...b,
              actual_seconds: displayedSeconds(b),
              started_at: null,
            }
          : b,
      ),
    );
    startTransition(async () => {
      applyBlocksResult(await stopBlock(block.id, date), snapshot);
    });
  }

  function handlePlannedMinutes(block: TimeBlock, plannedMinutes: number) {
    const snapshot = blocks;
    setBlocks((all) =>
      all.map((b) =>
        b.id === block.id ? { ...b, planned_minutes: plannedMinutes } : b,
      ),
    );
    startTransition(async () => {
      applyBlocksResult(
        await setBlockPlannedMinutes(block.id, date, plannedMinutes),
        snapshot,
      );
    });
  }

  function handleDoneToggle(block: TimeBlock) {
    const done = block.status !== "done";
    const snapshot = blocks;
    setBlocks((all) =>
      all.map((b) =>
        b.id === block.id
          ? {
              ...b,
              status: done
                ? "done"
                : b.actual_seconds > 0
                  ? "in_progress"
                  : "planned",
              actual_seconds: done ? displayedSeconds(b) : b.actual_seconds,
              started_at: done ? null : b.started_at,
            }
          : b,
      ),
    );
    startTransition(async () => {
      applyBlocksResult(await setBlockDone(block.id, date, done), snapshot);
    });
  }

  // --- Tasks ---------------------------------------------------------------

  function handleAddTask(blockId: string | null, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const temp: PlannerTask = {
      id: `temp-${crypto.randomUUID()}`,
      user_id: "",
      date,
      block_id: blockId,
      title: trimmed,
      done: false,
      rank: Date.now() / 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const snapshot = tasks;
    setTasks((all) => [...all, temp]);
    startTransition(async () => {
      const { task, error } = await createTask(date, blockId, trimmed);
      if (error || !task) {
        setTasks(snapshot);
        setNotice(error ?? "Could not add the task.");
      } else {
        setTasks((all) => all.map((t) => (t.id === temp.id ? task : t)));
      }
    });
  }

  function handleToggleTask(task: PlannerTask) {
    // Still being saved — its real id doesn't exist yet.
    if (task.id.startsWith("temp-")) return;
    const snapshot = tasks;
    setTasks((all) =>
      all.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
    );
    startTransition(async () => {
      const { error } = await setTaskDone(task.id, !task.done);
      if (error) {
        setTasks(snapshot);
        setNotice(error);
      }
    });
  }

  function handleDeleteTask(task: PlannerTask) {
    if (task.id.startsWith("temp-")) return;
    const snapshot = tasks;
    setTasks((all) => all.filter((t) => t.id !== task.id));
    startTransition(async () => {
      const { error } = await deleteTask(task.id);
      if (error) {
        setTasks(snapshot);
        setNotice(error);
      }
    });
  }

  // --- Day navigation (Mon–Sat; Sunday is skipped) --------------------------

  function goTo(iso: string) {
    // Transition keeps this day interactive while the next one loads.
    startTransition(() => router.push(`/planner?d=${iso}`));
  }

  const monday = mondayOf(date);
  // Memoised so the prefetch effect below doesn't re-run every render.
  const week = React.useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(monday, i)),
    [monday],
  );
  const today = toISODate(new Date());

  // Warm every day of this week plus the week view — one click, no wait.
  React.useEffect(() => {
    for (const iso of week) router.prefetch(`/planner?d=${iso}`);
    router.prefetch(`/planner?d=${date}&view=week`);
    router.prefetch("/");
  }, [router, date, week]);

  const ordered = BLOCK_CATEGORIES.map((c) =>
    blocks.find((b) => b.category === c.key),
  ).filter((b): b is TimeBlock => Boolean(b));

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="page-enter mx-auto flex w-full max-w-page flex-col gap-6 px-4 pt-8 pb-6 sm:px-8">
      {/* Day navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous day"
          onClick={() => goTo(addDays(date, date === monday ? -2 : -1))}
        >
          <ChevronLeft />
        </Button>
        <div className="flex gap-1">
          {week.map((iso) => (
            <Button
              key={iso}
              size="sm"
              variant={iso === date ? "primary" : "ghost"}
              onClick={() => goTo(iso)}
              className={cn(
                iso === today && iso !== date && "text-brand-primary",
              )}
            >
              {stripFormat.format(parseISODate(iso))}{" "}
              {parseISODate(iso).getDate()}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next day"
          onClick={() =>
            goTo(addDays(date, addDays(date, 1) > week[5] ? 2 : 1))
          }
        >
          <ChevronRight />
        </Button>
        <span className="text-neutral-secondary">
          {dayFormat.format(parseISODate(date))}
        </span>
        {ordered.some((b) => displayedSeconds(b) > 0) && (
          <span className="tabular-nums text-neutral-tertiary">
            ·{" "}
            {formatSeconds(
              ordered.reduce((sum, b) => sum + displayedSeconds(b), 0),
            )}{" "}
            tracked
          </span>
        )}
        {date !== today && (
          <Button variant="ghost" size="sm" onClick={() => goTo(today)}>
            Today
          </Button>
        )}
        <span aria-live="polite" className="text-danger">
          {notice}
        </span>
        <div className="ml-auto">
          <PlannerViewToggle date={date} active="day" />
        </div>
      </div>

      {/* The three fixed blocks */}
      <div className="grid gap-4 sm:grid-cols-3">
        {ordered.map((block) => {
          const category = BLOCK_CATEGORIES.find(
            (c) => c.key === block.category,
          )!;
          const seconds = displayedSeconds(block);
          const plannedSeconds = block.planned_minutes * 60;
          const ratio = plannedSeconds > 0 ? seconds / plannedSeconds : 0;
          const isRunning = block.started_at !== null;
          const isDone = block.status === "done";
          const blockTasks = tasks.filter((t) => t.block_id === block.id);

          return (
            <section
              key={block.id}
              className={cn(
                "glass flex flex-col gap-3 rounded-lg p-4",
                isRunning && "border-brand",
              )}
            >
              <header className="flex h-8 items-center justify-between gap-2">
                <h2 className="font-medium">{category.label}</h2>
                <PlannedHours
                  block={block}
                  onSave={(minutes) => handlePlannedMinutes(block, minutes)}
                />
              </header>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-2xl font-medium tabular-nums",
                    isRunning
                      ? "text-brand-primary"
                      : isDone
                        ? "text-neutral-tertiary"
                        : "text-neutral-primary",
                  )}
                >
                  {formatSeconds(seconds)}
                </span>
                {ratio >= 1 && !isDone && (
                  <span className="text-success">planned time reached</span>
                )}
              </div>

              <div className="h-1 overflow-hidden rounded-full bg-neutral-secondary">
                <div
                  className={cn(
                    "h-full rounded-full",
                    ratio >= 1 ? "bg-success" : "bg-brand-primary",
                  )}
                  style={{ width: `${Math.min(100, ratio * 100)}%` }}
                />
              </div>

              <div className="flex gap-2">
                {isRunning ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    appearance="outline"
                    onClick={() => handleStop(block)}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleStart(block)}
                    disabled={isDone}
                  >
                    Start
                  </Button>
                )}
                {/* Owner spec: done is cyan soft — also on hover before
                    it's done, as a preview of the completed state. */}
                <Button
                  size="sm"
                  variant={isDone ? "success" : "ghost"}
                  className={cn(
                    !isDone &&
                      "hover:border-success-soft hover:bg-success-soft hover:text-success active:bg-success-soft",
                  )}
                  onClick={() => handleDoneToggle(block)}
                >
                  <Check />
                  {isDone ? "Done" : "Mark done"}
                </Button>
              </div>

              <TaskList
                // Fills the rest of the card so every "Add task" field
                // sits on the same line across the three blocks.
                className="flex-1"
                tasks={blockTasks}
                onAdd={(title) => handleAddTask(block.id, title)}
                onToggle={handleToggleTask}
                onDelete={handleDeleteTask}
              />
            </section>
          );
        })}
      </div>

      {/* Tasks not attached to any block */}
      <section className="glass flex flex-col gap-2 rounded-lg p-4">
        <h2 className="font-medium">Other tasks</h2>
        <TaskList
          tasks={tasks.filter((t) => t.block_id === null)}
          onAdd={(title) => handleAddTask(null, title)}
          onToggle={handleToggleTask}
          onDelete={handleDeleteTask}
        />
      </section>
      </div>
    </main>
  );
}

// "2h planned" with a pencil; click either to edit the hours inline.
// Enter or blur saves, Esc cancels.
function PlannedHours({
  block,
  onSave,
}: {
  block: TimeBlock;
  onSave: (minutes: number) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const hours = block.planned_minutes / 60;

  function commit(raw: string) {
    setEditing(false);
    const value = Number(raw.replace(",", "."));
    if (!Number.isFinite(value) || value < 0 || value > 24) return;
    const minutes = Math.round(value * 60);
    if (minutes !== block.planned_minutes) onSave(minutes);
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <Input
          autoFocus
          type="number"
          min={0}
          max={24}
          step={0.5}
          defaultValue={hours}
          aria-label={`Planned hours for ${block.category}`}
          className="h-8 w-16 px-2 text-right"
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(e.currentTarget.value);
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <span className="text-neutral-tertiary">h</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`Edit planned hours (${hours}h)`}
      className="flex items-center gap-1 rounded-base px-2 py-1 text-neutral-tertiary outline-none transition-colors hover:bg-neutral-secondary hover:text-neutral-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {hours}h planned
      <Pencil className="size-3" />
    </button>
  );
}

function TaskList({
  tasks,
  onAdd,
  onToggle,
  onDelete,
  className,
}: {
  tasks: PlannerTask[];
  onAdd: (title: string) => void;
  onToggle: (task: PlannerTask) => void;
  onDelete: (task: PlannerTask) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <ul className="flex flex-col gap-1">
        {tasks.map((task) => (
          <li key={task.id} className="group flex items-center gap-2">
            {/* 32px hit area around the 16px visual box — thumbs miss
                anything smaller. */}
            <button
              type="button"
              role="checkbox"
              aria-checked={task.done}
              aria-label={task.title}
              onClick={() => onToggle(task)}
              className="group/check -m-2 flex size-8 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-sm border transition-colors",
                  task.done
                    ? "border-brand bg-brand-primary text-neutral-inverse"
                    : "border-neutral-primary group-hover/check:border-neutral-primary-hovered",
                )}
              >
                {task.done && <Check className="size-3" />}
              </span>
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                task.done && "text-neutral-tertiary line-through",
              )}
            >
              {task.title}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${task.title}`}
              // Hover reveal is invisible on touch — always show it there.
              className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
              onClick={() => onDelete(task)}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
      {/* mt-auto pins the field to the bottom of the card; pt-4 keeps at
          least 16px between it and the last task. */}
      <form
        className="mt-auto pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem(
            "title",
          ) as HTMLInputElement;
          onAdd(input.value);
          input.value = "";
        }}
      >
        <Input name="title" placeholder="Add task…" aria-label="Add task" />
      </form>
    </div>
  );
}
