-- Replace the email below with the email used for your UNFAZED account.
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('replace-with-your-account-email@example.com')
);

select auth.users.email, public.profiles.role
from auth.users
join public.profiles on public.profiles.id = auth.users.id
where lower(auth.users.email) = lower('replace-with-your-account-email@example.com');
