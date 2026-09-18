"use server";

import type { PlannerTask, TimeBlock } from "@/lib/planner-constants";
import { createClient } from "@/lib/supabase/server";

// Every block mutation returns the day's fresh rows so the client can
// reconcile its optimistic state with the database clock's numbers.
export type BlocksResult = { blocks: TimeBlock[] | null; error: string | null };

async function freshBlocks(date: string): Promise<BlocksResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("date", date);
  if (error) {
    console.error("freshBlocks failed:", error.message);
    return { blocks: null, error: "Could not reload the day." };
  }
  return { blocks: data, error: null };
}

export async function startBlock(
  id: string,
  date: string,
): Promise<BlocksResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_time_block", { block_id: id });
  if (error) {
    console.error("startBlock failed:", error.message);
    return { blocks: null, error: "Could not start the timer." };
  }
  return freshBlocks(date);
}

export async function stopBlock(
  id: string,
  date: string,
): Promise<BlocksResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("stop_time_block", { block_id: id });
  if (error) {
    console.error("stopBlock failed:", error.message);
    return { blocks: null, error: "Could not stop the timer." };
  }
  return freshBlocks(date);
}

export async function setBlockDone(
  id: string,
  date: string,
  done: boolean,
): Promise<BlocksResult> {
  const supabase = await createClient();

  if (done) {
    // A running timer is banked first, with the database clock.
    const { error: stopError } = await supabase.rpc("stop_time_block", {
      block_id: id,
    });
    if (stopError) console.error("setBlockDone stop failed:", stopError.message);
  }

  const { data: block, error: readError } = await supabase
    .from("time_blocks")
    .select("actual_seconds")
    .eq("id", id)
    .single();
  if (readError) {
    console.error("setBlockDone read failed:", readError.message);
    return { blocks: null, error: "Could not update the block." };
  }

  const status = done
    ? "done"
    : block.actual_seconds > 0
      ? "in_progress"
      : "planned";
  const { error } = await supabase
    .from("time_blocks")
    .update({ status })
    .eq("id", id);
  if (error) {
    console.error("setBlockDone failed:", error.message);
    return { blocks: null, error: "Could not update the block." };
  }
  return freshBlocks(date);
}

// --- Tasks -----------------------------------------------------------------

export async function createTask(
  date: string,
  blockId: string | null,
  title: string,
): Promise<{ task: PlannerTask | null; error: string | null }> {
  const trimmed = title.trim();
  if (!trimmed) return { task: null, error: "Task title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ date, block_id: blockId, title: trimmed })
    .select()
    .single();
  if (error) {
    console.error("createTask failed:", error.message);
    return { task: null, error: "Could not add the task." };
  }
  return { task: data, error: null };
}

export async function setTaskDone(
  id: string,
  done: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", id);
  if (error) {
    console.error("setTaskDone failed:", error.message);
    return { error: "Could not update the task." };
  }
  return { error: null };
}

export async function deleteTask(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) {
    console.error("deleteTask failed:", error.message);
    return { error: "Could not delete the task." };
  }
  return { error: null };
}
