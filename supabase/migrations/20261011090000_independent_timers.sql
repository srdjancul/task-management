-- Timers are independent: any number of blocks can run at once, each
-- banking its own elapsed time when stopped. Starting a block no longer
-- stops the others, so the one-running-timer backstop goes too.

drop index public.time_blocks_one_running_idx;
drop function public.stop_running_time_blocks();

-- Starting an already-running block is a no-op (it must not reset the
-- running clock), and a done block can't be started.
create or replace function public.start_time_block(block_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.time_blocks
  set started_at = now(),
      status = 'in_progress'
  where id = block_id
    and user_id = (select auth.uid())
    and status <> 'done'
    and started_at is null;
end;
$$;
