import { Board } from "@/components/board/board";
import { TopBar } from "@/components/top-bar";
import type { BoardContact } from "@/lib/contact-constants";
import { createClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, first_name, last_name, position, company, company_note, approach, niche, status, board_rank, source_url, created_at, touch_count, last_touch_at";
// note_at arrives with migration 20261001090000. Until that's applied the
// column doesn't exist (Postgres 42703) — load without it rather than
// break the board; notes just don't count as activity yet.
const WITH_NOTE = `${COLUMNS}, note_at` as const;
const UNDEFINED_COLUMN = "42703";

// Supabase caps a single response at 1,000 rows, so read in pages until
// a short page comes back — otherwise contacts past 1,000 silently vanish.
const BATCH = 1000;

export default async function OutreachPage() {
  const supabase = await createClient();

  const contacts: BoardContact[] = [];
  let failed = false;
  let withNote = true;
  for (let from = 0; ; from += BATCH) {
    const view = supabase.from("contacts_with_activity");
    const { data, error } = await (
      withNote ? view.select(WITH_NOTE) : view.select(COLUMNS)
    )
      .order("id")
      .range(from, from + BATCH - 1);
    if (error?.code === UNDEFINED_COLUMN && withNote) {
      withNote = false;
      from -= BATCH; // retry this batch without note_at
      continue;
    }
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
