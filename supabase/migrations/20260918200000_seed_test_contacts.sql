-- TEMPORARY test data so the board can be tried before quick add exists
-- (step 4). Runs only while the contacts table is empty. Every row is
-- obviously fake ("Test N Contact" at "Test Co N"); delete them from the
-- app whenever they stop being useful.
do $$
declare
  uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null or exists (select 1 from public.contacts) then
    return;
  end if;

  insert into public.contacts
    (user_id, first_name, last_name, position, company, approach, status, board_rank)
  values
    (uid, 'Test 1',  'Contact', 'Product Designer', 'Test Co 1',  'direct',  'to_contact',      1),
    (uid, 'Test 2',  'Contact', 'Frontend Dev',     'Test Co 2',  'applied', 'to_contact',      2),
    (uid, 'Test 3',  'Contact', 'Design Lead',      'Test Co 3',  'direct',  'contacted',       3),
    (uid, 'Test 4',  'Contact', 'Recruiter',        'Test Co 4',  'applied', 'contacted',       4),
    (uid, 'Test 5',  'Contact', 'CTO',              'Test Co 5',  'direct',  'followed_up',     5),
    (uid, 'Test 6',  'Contact', 'Founder',          'Test Co 6',  'applied', 'replied',         6),
    (uid, 'Test 7',  'Contact', 'Head of Design',   'Test Co 7',  'direct',  'in_conversation', 7),
    (uid, 'Test 8',  'Contact', 'HR Manager',       'Test Co 8',  'applied', 'interview',       8),
    (uid, 'Test 9',  'Contact', 'CEO',              'Test Co 9',  'direct',  'won',             9),
    (uid, 'Test 10', 'Contact', 'Team Lead',        'Test Co 10', 'applied', 'ghosted',         10);

  insert into public.touches (user_id, contact_id, happened_at, channel, direction, note)
  select uid, c.id, now() - make_interval(days => v.days_ago),
         v.channel::public.touch_channel, v.direction::public.touch_direction,
         'Seed touch'
  from (values
    ('Test 3',  2,  'email',    'sent'),
    ('Test 4',  9,  'linkedin', 'sent'),
    ('Test 5',  16, 'email',    'sent'),
    ('Test 5',  22, 'email',    'sent'),
    ('Test 6',  5,  'both',     'sent'),
    ('Test 6',  12, 'email',    'received'),
    ('Test 7',  1,  'email',    'received'),
    ('Test 7',  8,  'linkedin', 'sent'),
    ('Test 7',  20, 'email',    'sent'),
    ('Test 8',  3,  'email',    'received'),
    ('Test 9',  40, 'email',    'received'),
    ('Test 10', 30, 'linkedin', 'sent')
  ) as v(first_name, days_ago, channel, direction)
  join public.contacts c
    on c.first_name = v.first_name and c.last_name = 'Contact' and c.user_id = uid;
end $$;
