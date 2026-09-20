"use server";

import { createClient } from "@/lib/supabase/server";

// The outreach profile is the text Claude reads when drafting messages:
// who the owner is, positioning, projects, tone. Stored per user in the
// settings table — never in the repo.
const PROFILE_KEY = "outreach_profile";

export async function getOutreachProfile(): Promise<{
  value: string;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", PROFILE_KEY)
    .maybeSingle();

  if (error) {
    console.error("getOutreachProfile failed:", error.message);
    return { value: "", error: "Could not load the profile." };
  }
  return { value: data?.value ?? "", error: null };
}

export async function saveOutreachProfile(
  value: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: PROFILE_KEY, value }, { onConflict: "user_id,key" });

  if (error) {
    console.error("saveOutreachProfile failed:", error.message);
    return { error: "Could not save the profile." };
  }
  return { error: null };
}
