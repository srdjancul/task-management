-- Owner spec 2026-10-01: the contact note is where a conversation gets
-- written down, so writing it counts as activity. A contact added with a
-- note, or whose note changes, jumps to the top of its list and its day
-- counter restarts. note_at is stamped here with the database clock (like
-- the timers) — the client never sets it.
alter table public.contacts add column note_at timestamptz;

create function public.stamp_contact_note()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.note_at = case when new.company_note <> '' then now() end;
  elsif new.company_note is distinct from old.company_note
        and new.company_note <> '' then
    new.note_at = now();
  else
    -- Untouched or cleared note: keep the last stamp.
    new.note_at = old.note_at;
  end if;
  return new;
end;
$$;

create trigger contacts_stamp_note
  before insert or update on public.contacts
  for each row execute function public.stamp_contact_note();

-- The view selected c.* at creation time; recreate it to expose note_at.
drop view public.contacts_with_activity;
create view public.contacts_with_activity
with (security_invoker = true)
as
select
  c.*,
  count(t.id)::int as touch_count,
  max(t.happened_at) as last_touch_at
from public.contacts c
left join public.touches t on t.contact_id = c.id
group by c.id;
