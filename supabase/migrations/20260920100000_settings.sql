-- Key/value settings per user. First use: 'outreach_profile' — the text
-- Claude reads when drafting outreach messages. Content lives only in
-- the database (never in the repo).
create table public.settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.settings enable row level security;

create policy "Owner full access" on public.settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();
