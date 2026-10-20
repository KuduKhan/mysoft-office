-- MySoft Office v0.2, for a NEW DEDICATED Supabase project.
-- Apply to the separate MySoft database, NEVER to KHANIVERSITY.
create table if not exists public.mysoft_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint mysoft_payload_limit check (pg_column_size(payload) <= 2000000),
  constraint mysoft_payload_shape check (jsonb_typeof(payload) = 'object' and jsonb_typeof(payload->'files') = 'array')
);
alter table public.mysoft_workspaces enable row level security;
revoke all on table public.mysoft_workspaces from anon, authenticated;
grant select, insert, update on table public.mysoft_workspaces to authenticated;
create policy "mysoft_select_own_workspace" on public.mysoft_workspaces
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "mysoft_insert_own_workspace" on public.mysoft_workspaces
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "mysoft_update_own_workspace" on public.mysoft_workspaces
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- No DELETE policy by design: cloud snapshots are replaced atomically with upsert.
