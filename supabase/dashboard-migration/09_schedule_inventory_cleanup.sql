create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'release-expired-inventory-reservations',
  '*/5 * * * *',
  $$select public.release_expired_inventory_reservations();$$
);

select jobid, jobname, schedule, active
from cron.job
where jobname = 'release-expired-inventory-reservations';
