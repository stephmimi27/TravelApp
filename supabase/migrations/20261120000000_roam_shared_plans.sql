begin;

create schema if not exists roam_private;
revoke all on schema roam_private from public, anon, authenticated;
grant usage on schema roam_private to authenticated;

create function roam_private.verified_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(account.email))
  from auth.users as account
  where account.id = (select auth.uid())
    and account.email_confirmed_at is not null
    and account.email is not null;
$$;

revoke all on function roam_private.verified_email() from public, anon, authenticated;
grant execute on function roam_private.verified_email() to authenticated;

create table public.roam_shared_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  local_trip_id text not null,
  plan jsonb not null,
  updated_at timestamptz not null default clock_timestamp(),
  constraint roam_shared_plan_local_id check (char_length(btrim(local_trip_id)) between 1 and 255
    and local_trip_id = btrim(local_trip_id)),
  constraint roam_shared_plan_content check (jsonb_typeof(plan) = 'object'
    and octet_length(plan::text) <= 262144),
  unique (owner_id, local_trip_id),
  unique (id, owner_id)
);

create table public.roam_plan_invites (
  plan_id uuid not null,
  owner_id uuid not null,
  email text not null,
  constraint roam_plan_invite_email check (octet_length(email) <= 254
    and email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+$'),
  primary key (plan_id, email),
  foreign key (plan_id, owner_id)
    references public.roam_shared_plans (id, owner_id) on delete cascade
);

create index roam_plan_invites_email on public.roam_plan_invites (email, plan_id);

create function roam_private.stamp_plan_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger roam_plan_updated before update on public.roam_shared_plans
  for each row execute function roam_private.stamp_plan_update();
revoke all on function roam_private.stamp_plan_update() from public, anon, authenticated;

alter table public.roam_shared_plans enable row level security;
alter table public.roam_plan_invites enable row level security;

revoke all on public.roam_shared_plans, public.roam_plan_invites from public, anon, authenticated;
grant select, delete on public.roam_shared_plans, public.roam_plan_invites to authenticated;
grant insert (owner_id, local_trip_id, plan), update (plan) on public.roam_shared_plans to authenticated;
grant insert (plan_id, owner_id, email) on public.roam_plan_invites to authenticated;

create policy roam_plan_read on public.roam_shared_plans for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1
      from public.roam_plan_invites as invite
      where invite.plan_id = roam_shared_plans.id
        and invite.email = (select roam_private.verified_email())
    )
  );

create policy roam_plan_create on public.roam_shared_plans for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy roam_plan_update on public.roam_shared_plans for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy roam_plan_delete on public.roam_shared_plans for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy roam_invite_read on public.roam_plan_invites for select to authenticated
  using (owner_id = (select auth.uid()) or email = (select roam_private.verified_email()));

create policy roam_invite_create on public.roam_plan_invites for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy roam_invite_delete on public.roam_plan_invites for delete to authenticated
  using (owner_id = (select auth.uid()));

create function public.share_roam_plan(p_local_trip_id text, p_plan jsonb, p_email text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  shared_plan_id uuid;
begin
  if account_id is null then
    raise insufficient_privilege using message = 'Sign in to share a trip plan.';
  end if;

  insert into public.roam_shared_plans (owner_id, local_trip_id, plan)
  values (account_id, p_local_trip_id, p_plan)
  on conflict (owner_id, local_trip_id) do update set plan = excluded.plan
  returning id into shared_plan_id;

  insert into public.roam_plan_invites (plan_id, owner_id, email)
  values (shared_plan_id, account_id, lower(btrim(p_email)))
  on conflict (plan_id, email) do nothing;

  return shared_plan_id;
end;
$$;

revoke all on function public.share_roam_plan(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.share_roam_plan(text, jsonb, text) to authenticated;

commit;
