-- Company niche on contacts (owner spec: max 6 buckets — 5 named + Other).
-- The contacts_with_activity view selected c.* at creation time, so it
-- must be recreated to expose the new column.
create type public.contact_niche as enum
  ('web3', 'ai', 'saas', 'fintech', 'design', 'other');

alter table public.contacts
  add column niche public.contact_niche not null default 'other';

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
