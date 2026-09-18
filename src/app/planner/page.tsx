import type { Metadata } from "next";

import { PlannerDay } from "@/components/planner/planner-day";
import { TopBar } from "@/components/top-bar";
import {
  BLOCK_CATEGORIES,
  resolvePlannerDate,
  type PlannerTask,
  type TimeBlock,
} from "@/lib/planner-constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Planner" };

export default async function PlannerPage(props: PageProps<"/planner">) {
  const searchParams = await props.searchParams;
  const requested =
    typeof searchParams.d === "string" ? searchParams.d : undefined;
  const date = resolvePlannerDate(requested);

  const supabase = await createClient();

  // The three fixed blocks exist from the first visit to a day.
  await supabase.from("time_blocks").upsert(
    BLOCK_CATEGORIES.map((c) => ({
      date,
      category: c.key,
      planned_minutes: c.plannedMinutes,
    })),
    { onConflict: "user_id,date,category", ignoreDuplicates: true },
  );

  const [blocksResult, tasksResult] = await Promise.all([
    supabase.from("time_blocks").select("*").eq("date", date),
    supabase
      .from("tasks")
      .select("*")
      .eq("date", date)
      .order("rank", { ascending: true }),
  ]);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar active="planner" />
      {blocksResult.error || tasksResult.error ? (
        <p className="p-4 text-danger">Could not load the day. Reload.</p>
      ) : (
        <PlannerDay
          date={date}
          initialBlocks={(blocksResult.data ?? []) as TimeBlock[]}
          initialTasks={(tasksResult.data ?? []) as PlannerTask[]}
        />
      )}
    </div>
  );
}
