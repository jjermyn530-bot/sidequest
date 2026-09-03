create table if not exists public.sidequest_tasks (
  id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null,
  deleted boolean not null default false,
  primary key (user_id, id)
);

create index if not exists sidequest_tasks_user_updated_idx
  on public.sidequest_tasks (user_id, updated_at);

alter table public.sidequest_tasks enable row level security;
revoke all on table public.sidequest_tasks from anon, authenticated;
grant select, insert, update on table public.sidequest_tasks to authenticated;

drop policy if exists "Users read their own Sidequest tasks" on public.sidequest_tasks;
create policy "Users read their own Sidequest tasks"
  on public.sidequest_tasks for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own Sidequest tasks" on public.sidequest_tasks;
create policy "Users create their own Sidequest tasks"
  on public.sidequest_tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own Sidequest tasks" on public.sidequest_tasks;
create policy "Users update their own Sidequest tasks"
  on public.sidequest_tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.sidequest_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null
);

alter table public.sidequest_settings enable row level security;
revoke all on table public.sidequest_settings from anon, authenticated;
grant select, insert, update on table public.sidequest_settings to authenticated;

drop policy if exists "Users read their own Sidequest settings" on public.sidequest_settings;
create policy "Users read their own Sidequest settings"
  on public.sidequest_settings for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own Sidequest settings" on public.sidequest_settings;
create policy "Users create their own Sidequest settings"
  on public.sidequest_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own Sidequest settings" on public.sidequest_settings;
create policy "Users update their own Sidequest settings"
  on public.sidequest_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
