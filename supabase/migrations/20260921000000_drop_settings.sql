-- The in-app Claude drafting feature was removed (separate API billing);
-- its settings table is no longer used.
drop table if exists public.settings;
