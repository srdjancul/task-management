-- Remove the temporary seed contacts ("Test N Contact" at "Test Co N")
-- now that real data is going in. Their touches cascade.
delete from public.contacts
where last_name = 'Contact'
  and first_name like 'Test %'
  and company like 'Test Co %';
