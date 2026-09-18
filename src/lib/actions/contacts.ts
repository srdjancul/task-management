"use server";

import {
  APPROACHES,
  CONTACT_STATUSES,
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
  return null;
}

// Persist a card move: new column (status) and/or new position in the
// column (board_rank). RLS limits every query here to the owner's rows.
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
