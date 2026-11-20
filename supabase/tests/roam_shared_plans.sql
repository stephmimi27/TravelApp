-- Run as postgres against a test project after applying the migrations.
-- All fixture users and plans are rolled back.
begin;
set local plpgsql.check_asserts = on;

insert into auth.users (id, email, email_confirmed_at) values
  ('52e6e96e-49f7-41b7-9db1-000000000001', 'roam.owner@example.test', now()),
  ('52e6e96e-49f7-41b7-9db1-000000000002', 'roam.guest@example.test', now()),
  ('52e6e96e-49f7-41b7-9db1-000000000003', 'roam.outsider@example.test', now()),
  ('52e6e96e-49f7-41b7-9db1-000000000004', 'roam.unverified@example.test', null);

set local role authenticated;
set local request.jwt.claims = '{"sub":"52e6e96e-49f7-41b7-9db1-000000000001"}';

do $$
declare
  shared_id uuid;
  first_update timestamptz;
  new_update timestamptz;
begin
  shared_id := public.share_roam_plan('local-trip', '{"name":"First plan"}', ' ROAM.GUEST@EXAMPLE.TEST ');
  perform set_config('roam_test.shared_id', shared_id::text, true);
  assert shared_id is not null, 'Sharing must return the plan ID';
  select updated_at into first_update from public.roam_shared_plans where id = shared_id;
  assert public.share_roam_plan('local-trip', '{"name":"Updated plan"}', 'roam.guest@example.test') = shared_id,
    'Sharing twice must reuse the same plan ID';
  assert (select plan->>'name' from public.roam_shared_plans where id = shared_id) = 'First plan',
    'Sharing again must preserve the published plan';
  assert public.edit_roam_plan(shared_id, '{"name":"Updated plan"}', 1) = 2,
    'The owner can update the plan with its current revision';
  select updated_at into new_update from public.roam_shared_plans where id = shared_id;
  assert new_update > first_update, 'Updating the plan must set a new server timestamp';
  perform public.share_roam_plan('local-trip', '{"name":"Updated plan"}', 'roam.unverified@example.test');
  assert (select count(*) from public.roam_plan_invites where plan_id = shared_id) = 2,
    'An owner can invite multiple travelers and repeat requests without duplication';

  begin
    perform public.share_roam_plan('local-trip', '{"name":"Should roll back"}', 'invalid-email');
    raise exception 'An invalid invite was accepted';
  exception when check_violation then
    assert (select plan->>'name' from public.roam_shared_plans where id = shared_id) = 'Updated plan',
      'A failed invitation must roll back the associated plan update';
  end;

  begin
    perform public.share_roam_plan('oversize', jsonb_build_object('name', repeat('A', 262145)), 'roam.guest@example.test');
    raise exception 'An oversized plan was accepted';
  exception when check_violation then
    null;
  end;
end;
$$;

set local request.jwt.claims = '{"sub":"52e6e96e-49f7-41b7-9db1-000000000002","email":"roam.guest@example.test"}';

do $$
declare
  shared_id uuid := current_setting('roam_test.shared_id')::uuid;
  guest_id uuid := auth.uid();
begin
  assert (select plan->>'name' from public.roam_shared_plans where id = shared_id) = 'Updated plan',
    'The invited account can view the latest plan';
  assert (select count(*) from public.roam_plan_invites where plan_id = shared_id) = 1,
    'The invited account can only see its own invitation';

  assert public.edit_roam_plan(shared_id, '{}', 2) is null,
    'The invited account cannot edit the plan with default view access';
  delete from public.roam_shared_plans where id = shared_id;
  assert not found, 'The invited account cannot delete the plan';
  delete from public.roam_plan_invites where plan_id = shared_id;
  assert not found, 'The invited account cannot revoke an invitation';

  begin
    insert into public.roam_plan_invites (plan_id, owner_id, email)
    values (shared_id, guest_id, 'roam.outsider@example.test');
    raise exception 'An invited account invited other accounts';
  exception when foreign_key_violation then
    null;
  end;

  begin
    insert into public.roam_plan_invites (plan_id, owner_id, email)
    values (shared_id, '52e6e96e-49f7-41b7-9db1-000000000001', 'roam.outsider@example.test');
    raise exception 'An invited account impersonated the plan owner';
  exception when insufficient_privilege then
    null;
  end;

  assert public.share_roam_plan('local-trip', '{"name":"Guest plan"}', 'roam.outsider@example.test') <> shared_id,
    'A local trip ID can be reused by a different owner';
end;
$$;

set local request.jwt.claims = '{"sub":"52e6e96e-49f7-41b7-9db1-000000000003","email":"roam.guest@example.test"}';

do $$
declare
  shared_id uuid := current_setting('roam_test.shared_id')::uuid;
begin
  assert not exists (select 1 from public.roam_shared_plans where id = shared_id),
    'An unrelated account cannot read a plan even with the invited email in its token';
  assert not exists (select 1 from public.roam_plan_invites where plan_id = shared_id),
    'An unrelated account cannot read the invitations';
end;
$$;

set local request.jwt.claims = '{"sub":"52e6e96e-49f7-41b7-9db1-000000000004","email":"roam.unverified@example.test"}';

do $$
begin
  assert not exists (select 1 from public.roam_shared_plans where id = current_setting('roam_test.shared_id')::uuid),
    'An invited account without email confirmation cannot read the plan';
end;
$$;

reset role;
update auth.users set email = 'roam.changed@example.test'
where id = '52e6e96e-49f7-41b7-9db1-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub":"52e6e96e-49f7-41b7-9db1-000000000002","email":"roam.guest@example.test"}';

do $$
begin
  assert not exists (select 1 from public.roam_shared_plans where id = current_setting('roam_test.shared_id')::uuid),
    'Changing a verified email must remove access to the old email grants despite a stale token';
end;
$$;

set local request.jwt.claims = '{"sub":"52e6e96e-49f7-41b7-9db1-000000000001"}';

do $$
declare
  shared_id uuid := current_setting('roam_test.shared_id')::uuid;
begin
  assert public.edit_roam_plan(shared_id, '{"name":"Owner edit"}', 2) = 3,
    'The owner can edit the plan';
  delete from public.roam_plan_invites where plan_id = shared_id and email = 'roam.guest@example.test';
  assert found, 'The owner can revoke a selected invitation';
  assert (select count(*) from public.roam_plan_invites where plan_id = shared_id) = 1,
    'Revoking one invitation must preserve other invitations';
  delete from public.roam_shared_plans where id = shared_id;
  assert found, 'The owner can stop sharing the plan';
  assert not exists (select 1 from public.roam_plan_invites where plan_id = shared_id),
    'Deleting the shared plan must also remove its invitations';
end;
$$;

set local role anon;
set local request.jwt.claims = '{}';

do $$
begin
  begin
    perform 1 from public.roam_shared_plans;
    raise exception 'An anonymous user can query shared plans';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.share_roam_plan('anonymous', '{}', 'roam.guest@example.test');
    raise exception 'An anonymous user can call the sharing function';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

rollback;
