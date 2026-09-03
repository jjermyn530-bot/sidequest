create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'sidequest-notifications-every-minute';
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'sidequest-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://elkvochblyzpvuyexvgs.supabase.co/functions/v1/sidequest-notifications',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
