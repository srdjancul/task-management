import type { Database } from "@/lib/supabase/database.types";

export type BlockCategory = Database["public"]["Enums"]["block_category"];
export type TimeBlock = Database["public"]["Tables"]["time_blocks"]["Row"];
export type PlannerTask = Database["public"]["Tables"]["tasks"]["Row"];

// The fixed daily plan: three blocks, Monday to Saturday.
export const BLOCK_CATEGORIES = [
  { key: "research", label: "Research", plannedMinutes: 120 },
  { key: "client_work", label: "Client work", plannedMinutes: 360 },
  { key: "internal", label: "Internal projects", plannedMinutes: 120 },
] as const satisfies readonly {
  key: BlockCategory;
  label: string;
  plannedMinutes: number;
}[];

export const CATEGORY_LABELS: Record<BlockCategory, string> =
  Object.fromEntries(
    BLOCK_CATEGORIES.map((c) => [c.key, c.label]),
  ) as Record<BlockCategory, string>;

// --- Local-date helpers (yyyy-mm-dd, no timezone surprises) ---------------

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function isSunday(iso: string): boolean {
  return parseISODate(iso).getDay() === 0;
}

// Monday of the ISO week containing `iso`.
export function mondayOf(iso: string): string {
  const date = parseISODate(iso);
  const shift = (date.getDay() + 6) % 7;
  return addDays(iso, -shift);
}

// The planner covers Mon–Sat; a Sunday rolls forward to Monday.
export function resolvePlannerDate(requested?: string): string {
  const iso =
    requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)
      ? requested
      : toISODate(new Date());
  return isSunday(iso) ? addDays(iso, 1) : iso;
}
