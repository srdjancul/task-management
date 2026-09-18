-- Initial schema: outreach CRM (contacts, touches) and daily planner
-- (time_blocks, tasks). Single user, but every row carries user_id and is
-- locked to its owner by RLS, so nothing is readable without login.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.contact_approach as enum ('applied', 'direct');

create type public.contact_status as enum (
  'to_contact',
  'contacted',
  'followed_up',
  'replied',
  'in_conversation',
  'interview',
  'won',
  'rejected',
  'ghosted'
);

create type public.touch_channel as enum ('email', 'linkedin', 'both');
create type public.touch_direction as enum ('sent', 'received');

create type public.block_category as enum ('research', 'client_work', 'internal');
create type public.block_status as enum ('planned', 'in_progress', 'done', 'skipped');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  position text not null default '',
  company text not null default '',
  company_note text not null default '',
  approach public.contact_approach not null default 'direct',
  status public.contact_status not null default 'to_contact',
  source_url text,
  -- Order of cards inside a kanban column; fractional so a drop between two
  -- cards only rewrites the moved card.
  board_rank double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_user_status_rank_idx on public.contacts (user_id, status, board_rank);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- touches — every outreach event. Touch count and last contact date are
-- always derived from here (see contacts_with_activity), never stored.
-- ---------------------------------------------------------------------------
create table public.touches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  happened_at timestamptz not null default now(),
  channel public.touch_channel not null,
  direction public.touch_direction not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index touches_contact_happened_idx on public.touches (contact_id, happened_at desc);

-- ---------------------------------------------------------------------------
-- contacts_with_activity — contacts plus derived touch stats.
-- security_invoker makes the view obey the caller's RLS.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- time_blocks — three fixed blocks per working day (Mon–Sat).
-- A block is running while started_at is set; stopping adds the elapsed
-- time to actual_seconds and clears started_at.
-- ---------------------------------------------------------------------------
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  category public.block_category not null,
  planned_minutes int not null check (planned_minutes >= 0),
  actual_seconds int not null default 0 check (actual_seconds >= 0),
  status public.block_status not null default 'planned',
  started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_blocks_monday_to_saturday check (extract(isodow from date) between 1 and 6),
  constraint time_blocks_one_per_category unique (user_id, date, category)
);

-- Only one running timer per user, enforced by the database.
create unique index time_blocks_one_running_idx
  on public.time_blocks (user_id)
  where started_at is not null;

create trigger time_blocks_set_updated_at
  before update on public.time_blocks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks — belong to a day, optionally attached to one of its blocks.
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  block_id uuid references public.time_blocks (id) on delete set null,
  title text not null,
  done boolean not null default false,
  rank double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_date_idx on public.tasks (user_id, date);
create index tasks_block_idx on public.tasks (block_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security: owner-only on every table.
-- ---------------------------------------------------------------------------
alter table public.contacts enable row level security;
alter table public.touches enable row level security;
alter table public.time_blocks enable row level security;
alter table public.tasks enable row level security;

create policy "Owner full access" on public.contacts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner full access" on public.touches
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.contacts c
      where c.id = contact_id and c.user_id = (select auth.uid())
    )
  );

create policy "Owner full access" on public.time_blocks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner full access" on public.tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
