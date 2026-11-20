begin;

alter table public.roam_plan_invites add column can_edit boolean not null default false;
alter table public.roam_shared_plans add column revision bigint not null default 1
  constraint roam_shared_plan_revision check (revision > 0);

grant insert (can_edit), update (can_edit) on public.roam_plan_invites to authenticated;
create policy roam_invite_update on public.roam_plan_invites for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- All plan edits, including an owner's, must use the same revision check.
revoke update (plan) on public.roam_shared_plans from authenticated;
drop policy roam_plan_update on public.roam_shared_plans;

create or replace function roam_private.stamp_plan_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  new.revision := old.revision + 1;
  return new;
end;
$$;

drop function public.share_roam_plan(text, jsonb, text);

create function public.invite_roam_plan(p_plan_id uuid, p_email text, p_can_edit boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  perform 1 from public.roam_shared_plans where id = p_plan_id and owner_id = account_id;
  if not found then
    raise insufficient_privilege using message = 'Only the plan owner can invite accounts.';
  end if;

  insert into public.roam_plan_invites (plan_id, owner_id, email, can_edit)
  values (p_plan_id, account_id, lower(btrim(p_email)), p_can_edit)
  on conflict (plan_id, email) do update set can_edit = excluded.can_edit;
end;
$$;

revoke all on function public.invite_roam_plan(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.invite_roam_plan(uuid, text, boolean) to authenticated;

create function public.share_roam_plan(
  p_local_trip_id text,
  p_plan jsonb,
  p_email text,
  p_can_edit boolean default false
)
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

  select id into shared_plan_id from public.roam_shared_plans
  where owner_id = account_id and local_trip_id = p_local_trip_id;

  if shared_plan_id is null then
    insert into public.roam_shared_plans (owner_id, local_trip_id, plan)
    values (account_id, p_local_trip_id, p_plan)
    on conflict (owner_id, local_trip_id) do nothing
    returning id into shared_plan_id;

    -- Another request may have created this plan between the first read and insert.
    if shared_plan_id is null then
      select id into shared_plan_id from public.roam_shared_plans
      where owner_id = account_id and local_trip_id = p_local_trip_id;
    end if;
  end if;

  perform public.invite_roam_plan(shared_plan_id, p_email, p_can_edit);

  return shared_plan_id;
end;
$$;

revoke all on function public.share_roam_plan(text, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.share_roam_plan(text, jsonb, text, boolean) to authenticated;

create function public.edit_roam_plan(p_plan_id uuid, p_plan jsonb, p_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  account_email text;
  plan_owner uuid;
  next_revision bigint;
begin
  if account_id is null then
    return null;
  end if;
  account_email := roam_private.verified_email();

  select shared.owner_id into plan_owner
  from public.roam_shared_plans as shared
  where shared.id = p_plan_id and shared.revision = p_revision
    and (shared.owner_id = account_id or exists (
      select 1 from public.roam_plan_invites as invite
      where invite.plan_id = shared.id and invite.email = account_email and invite.can_edit
    ))
  for no key update;

  if not found then
    return null;
  end if;

  if plan_owner <> account_id then
    -- Keep the invite valid through the save. Lock the plan first so plan deletion
    -- and its cascading invite deletion use the same lock order.
    perform 1 from public.roam_plan_invites as invite
    where invite.plan_id = p_plan_id and invite.email = account_email and invite.can_edit
    for share;
    if not found then
      return null;
    end if;
  end if;

  update public.roam_shared_plans set plan = p_plan
  where id = p_plan_id and revision = p_revision
  returning revision into next_revision;

  return next_revision;
end;
$$;

revoke all on function public.edit_roam_plan(uuid, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.edit_roam_plan(uuid, jsonb, bigint) to authenticated;

commit;
