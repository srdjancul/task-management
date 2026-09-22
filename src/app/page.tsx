import { Board } from "@/components/board/board";
import { TopBar } from "@/components/top-bar";
import type { BoardContact } from "@/lib/contact-constants";
import { createClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, first_name, last_name, position, company, company_note, approach, niche, status, board_rank, source_url, created_at, touch_count, last_touch_at";

// Supabase caps a single response at 1,000 rows, so read in pages until
// a short page comes back — otherwise contacts past 1,000 silently vanish.
const BATCH = 1000;

export default async function OutreachPage() {
  const supabase = await createClient();

  const contacts: BoardContact[] = [];
  let failed = false;
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabase
      .from("contacts_with_activity")
      .select(COLUMNS)
      .order("id")
      .range(from, from + BATCH - 1);
    if (error) {
      console.error("load contacts failed:", error.message);
      failed = true;
      break;
    }
    contacts.push(...(data as BoardContact[]));
    if (data.length < BATCH) break;
  }

  return (
    <div className="flex h-dvh flex-col">
      <TopBar active="outreach" />
      {failed ? (
        <p className="p-4 text-danger">Could not load contacts. Reload.</p>
      ) : (
        <Board contacts={contacts} />
      )}
    </div>
  );
}
