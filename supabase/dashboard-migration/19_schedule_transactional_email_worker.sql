create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

do $$
declare
  project_url constant text := 'https://YOUR_PROJECT_REF.supabase.co';
  function_api_key constant text := 'YOUR_UNFAZED_SUPABASE_SECRET_KEY';
begin
  if project_url like '%YOUR_PROJECT_REF%'
    or function_api_key like '%YOUR_UNFAZED_SUPABASE_SECRET_KEY%' then
    raise exception 'Replace both placeholders in this query before running it';
  end if;

  perform vault.create_secret(
    project_url,
    'unfazed_project_url',
    'Supabase project URL used by the transactional-email Cron job'
  );

  perform vault.create_secret(
    function_api_key,
    'unfazed_function_api_key',
    'Secret Edge Function API key used only by trusted scheduled jobs'
  );
end;
$$;

select cron.schedule(
  'process-order-email-queue',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'unfazed_project_url'
    ) || '/functions/v1/process-order-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'unfazed_function_api_key'
      )
    ),
    body := jsonb_build_object('scheduled_at', now()),
    timeout_milliseconds := 10000
  );
  $$
);

select jobid, jobname, schedule, active
from cron.job
where jobname = 'process-order-email-queue';
