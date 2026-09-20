"use server";

import {
  APPROACHES,
  CONTACT_STATUSES,
  NICHES,
  type ContactFields,
  type ContactStatus,
} from "@/lib/contact-constants";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

function invalidFields(fields: ContactFields): string | null {
  if (!fields.first_name.trim()) return "First name is required.";
  if (!APPROACHES.includes(fields.approach)) return "Invalid approach.";
  if (!NICHES.includes(fields.niche)) return "Invalid niche.";
  return null;
}

// Persist a card placement: any of status, approach and board_rank.
// Dragging between board groups changes approach and/or status; the
// panel's status select changes status alone. RLS limits every query
// here to the owner's rows.
export async function placeContact(
  id: string,
  patch: {
    status?: ContactStatus;
    approach?: (typeof APPROACHES)[number];
    boardRank?: number;
  },
): Promise<ActionResult> {
  const update: {
    status?: ContactStatus;
    approach?: (typeof APPROACHES)[number];
    board_rank?: number;
  } = {};
  if (patch.status !== undefined) {
    if (!CONTACT_STATUSES.includes(patch.status))
      return { error: "Invalid status." };
    update.status = patch.status;
  }
  if (patch.approach !== undefined) {
    if (!APPROACHES.includes(patch.approach))
      return { error: "Invalid approach." };
    update.approach = patch.approach;
  }
  if (patch.boardRank !== undefined) {
    if (!Number.isFinite(patch.boardRank)) return { error: "Invalid move." };
    update.board_rank = patch.boardRank;
  }
  if (Object.keys(update).length === 0) return { error: "Nothing to save." };

  const supabase = await createClient();
  const { error } = await supabase.from("contacts").update(update).eq("id", id);

  if (error) {
    console.error("placeContact failed:", error.message);
    return { error: "Move failed — put back." };
  }
  return { error: null };
}

export async function createContact(
  fields: ContactFields,
  boardRank: number,
): Promise<{ contact: ContactRow | null; error: string | null }> {
  const invalid = invalidFields(fields);
  if (invalid || !Number.isFinite(boardRank)) {
    return { contact: null, error: invalid ?? "Invalid contact." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...fields, board_rank: boardRank })
    .select()
    .single();

  if (error) {
    console.error("createContact failed:", error.message);
    return { contact: null, error: "Could not save the contact." };
  }
  return { contact: data, error: null };
}

export async function updateContact(
  id: string,
  fields: ContactFields,
): Promise<ActionResult> {
  const invalid = invalidFields(fields);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update(fields)
    .eq("id", id);

  if (error) {
    console.error("updateContact failed:", error.message);
    return { error: "Could not save the changes." };
  }
  return { error: null };
}

// Deletes the contact and, via ON DELETE CASCADE, its touches.
export async function deleteContact(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) {
    console.error("deleteContact failed:", error.message);
    return { error: "Could not delete the contact." };
  }
  return { error: null };
}
