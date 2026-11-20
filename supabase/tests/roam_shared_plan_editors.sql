-- Run as postgres against a test project after applying the migrations.
begin;
set local plpgsql.check_asserts = on;

insert into auth.users (id, email, email_confirmed_at) values
  ('a126e96e-49f7-41b7-9db1-000000000001', 'roam.editor.owner@example.test', now()),
  ('a126e96e-49f7-41b7-9db1-000000000002', 'roam.editor.friend@example.test', now()),
  ('a126e96e-49f7-41b7-9db1-000000000003', 'roam.editor.other@example.test', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"a126e96e-49f7-41b7-9db1-000000000001"}';

do $$
declare
  shared_id uuid;
begin
  shared_id := public.share_roam_plan('source-trip', '{"name":"Initial plan"}', 'roam.editor.friend@example.test', true);
  perform set_config('roam_test.editor_plan_id', shared_id::text, true);

  assert (select revision from public.roam_shared_plans where id = shared_id) = 1;
  assert (select can_edit from public.roam_plan_invites where plan_id = shared_id);

  begin
    update public.roam_shared_plans set plan = '{}' where id = shared_id;
    raise exception 'The owner bypassed the revision check';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.roam_plan_invites set email = 'roam.editor.other@example.test' where plan_id = shared_id;
    raise exception 'The owner changed the invitation identity through UPDATE';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

set local request.jwt.claims = '{"sub":"a126e96e-49f7-41b7-9db1-000000000002"}';

do $$
declare
  shared_id uuid := current_setting('roam_test.editor_plan_id')::uuid;
begin
  assert public.edit_roam_plan(shared_id, '{"name":"Editor update"}', 1) = 2;
  assert (select plan->>'name' from public.roam_shared_plans where id = shared_id) = 'Editor update';

  update public.roam_plan_invites set can_edit = false where plan_id = shared_id;
  assert not found, 'Invited editors cannot change roles';

  begin
    perform public.invite_roam_plan(shared_id, 'roam.editor.other@example.test', true);
    raise exception 'An invited editor granted access to someone else';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.edit_roam_plan(shared_id, '[]', 2);
    raise exception 'An editor saved an invalid plan';
  exception when check_violation then
    assert (select revision from public.roam_shared_plans where id = shared_id) = 2;
  end;
end;
$$;

set local request.jwt.claims = '{"sub":"a126e96e-49f7-41b7-9db1-000000000001"}';

do $$
declare
  shared_id uuid := current_setting('roam_test.editor_plan_id')::uuid;
begin
  assert public.edit_roam_plan(shared_id, '{"name":"Stale owner update"}', 1) is null;
  assert (select plan->>'name' from public.roam_shared_plans where id = shared_id) = 'Editor update';

  perform public.invite_roam_plan(shared_id, ' ROAM.EDITOR.OTHER@EXAMPLE.TEST ', true);
  assert (select revision from public.roam_shared_plans where id = shared_id) = 2,
    'Inviting from a shared plan must leave its content and revision intact';

  assert public.share_roam_plan('source-trip', '{"name":"Old local data"}', 'roam.editor.other@example.test', true) = shared_id;
  assert (select plan->>'name' from public.roam_shared_plans where id = shared_id) = 'Editor update',
    'A repeat share using a local copy must preserve collaborator edits';

  update public.roam_plan_invites set can_edit = false
  where plan_id = shared_id and email = 'roam.editor.friend@example.test';
  assert found, 'The owner can downgrade an editor to a viewer';
end;
$$;

set local request.jwt.claims = '{"sub":"a126e96e-49f7-41b7-9db1-000000000002"}';

do $$
declare
  shared_id uuid := current_setting('roam_test.editor_plan_id')::uuid;
begin
  assert (select count(*) from public.roam_plan_invites where plan_id = shared_id) = 1;
  assert not (select can_edit from public.roam_plan_invites where plan_id = shared_id);
  assert public.edit_roam_plan(shared_id, '{"name":"Downgraded editor update"}', 2) is null;
  assert (select plan->>'name' from public.roam_shared_plans where id = shared_id) = 'Editor update';
end;
$$;

reset role;
update auth.users set email = 'roam.editor.changed@example.test' where id = 'a126e96e-49f7-41b7-9db1-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"a126e96e-49f7-41b7-9db1-000000000003","email":"roam.editor.other@example.test"}';

do $$
declare
  shared_id uuid := current_setting('roam_test.editor_plan_id')::uuid;
begin
  assert public.edit_roam_plan(shared_id, '{"name":"Stale email update"}', 2) is null;
  assert not exists (select 1 from public.roam_shared_plans where id = shared_id);
end;
$$;

set local role anon;
set local request.jwt.claims = '{}';

do $$
begin
  begin
    perform public.edit_roam_plan(current_setting('roam_test.editor_plan_id')::uuid, '{}', 2);
    raise exception 'An anonymous account called the editor function';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

rollback;
