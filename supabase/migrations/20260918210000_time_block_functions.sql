-- Timer control for time_blocks. All elapsed-time math happens here with
-- the database clock, so client clock drift never corrupts actual_seconds.
-- Both functions run as the caller (RLS applies), and starting a block
-- first stops whatever else is running — one timer at a time by design
-- (the partial unique index remains the backstop).

create function public.stop_running_time_blocks()
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.time_blocks
  set actual_seconds =
        (actual_seconds + greatest(0, extract(epoch from (now() - started_at))))::int,
      started_at = null
  where user_id = (select auth.uid())
    and started_at is not null;
end;
$$;

create function public.start_time_block(block_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.stop_running_time_blocks();

  update public.time_blocks
  set started_at = now(),
      status = 'in_progress'
  where id = block_id
    and user_id = (select auth.uid())
    and status <> 'done';
end;
$$;

create function public.stop_time_block(block_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.time_blocks
  set actual_seconds =
        (actual_seconds + greatest(0, extract(epoch from (now() - started_at))))::int,
      started_at = null
  where id = block_id
    and user_id = (select auth.uid())
    and started_at is not null;
end;
$$;
