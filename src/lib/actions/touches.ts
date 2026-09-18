"use server";

import {
  TOUCH_CHANNELS,
  TOUCH_DIRECTIONS,
  type ContactTouch,
  type TouchChannel,
  type TouchDirection,
} from "@/lib/contact-constants";
import { createClient } from "@/lib/supabase/server";

export type TouchInput = {
  happened_at: string;
  channel: TouchChannel;
  direction: TouchDirection;
  note: string;
};

export async function createTouch(
  contactId: string,
  input: TouchInput,
  // One special case, owner-approved: logging a touch on someone still in
  // "to_contact" moves them to "contacted" automatically.
  moveToContacted: boolean,
): Promise<{ touch: ContactTouch | null; error: string | null }> {
  if (
    !TOUCH_CHANNELS.includes(input.channel) ||
    !TOUCH_DIRECTIONS.includes(input.direction) ||
    Number.isNaN(Date.parse(input.happened_at))
  ) {
    return { touch: null, error: "Invalid touch." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("touches")
    .insert({ contact_id: contactId, ...input })
    .select()
    .single();

  if (error) {
    console.error("createTouch failed:", error.message);
    return { touch: null, error: "Could not log the touch." };
  }

  if (moveToContacted) {
    const { error: moveError } = await supabase
      .from("contacts")
      .update({ status: "contacted" })
      .eq("id", contactId)
      .eq("status", "to_contact");
    if (moveError) console.error("auto-move failed:", moveError.message);
  }

  return { touch: data, error: null };
}

export async function deleteTouch(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("touches").delete().eq("id", id);

  if (error) {
    console.error("deleteTouch failed:", error.message);
    return { error: "Could not delete the touch." };
  }
  return { error: null };
}
