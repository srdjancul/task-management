import { Board } from "@/components/board/board";
import { TopBar } from "@/components/top-bar";
import type { BoardContact } from "@/lib/contact-constants";
import { createClient } from "@/lib/supabase/server";

export default async function OutreachPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts_with_activity")
    .select(
      "id, first_name, last_name, position, company, approach, status, board_rank, touch_count, last_touch_at",
    );

  return (
    <div className="flex h-dvh flex-col">
      <TopBar active="outreach" />
      {error ? (
        <p className="p-4 text-danger">Could not load contacts. Reload.</p>
      ) : (
        <Board contacts={(data ?? []) as BoardContact[]} />
      )}
    </div>
  );
}
