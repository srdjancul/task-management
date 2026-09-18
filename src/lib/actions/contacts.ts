"use server";

import { CONTACT_STATUSES, type ContactStatus } from "@/lib/contact-constants";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

// Persist a card move: new column (status) and/or new position in the
// column (board_rank). RLS limits the update to the owner's rows.
export async function moveContact(
  id: string,
  status: ContactStatus,
  boardRank: number,
): Promise<ActionResult> {
  if (!CONTACT_STATUSES.includes(status) || !Number.isFinite(boardRank)) {
    return { error: "Invalid move." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ status, board_rank: boardRank })
    .eq("id", id);

  if (error) {
    console.error("moveContact failed:", error.message);
    return { error: "Move failed — put back." };
  }
  return { error: null };
}
