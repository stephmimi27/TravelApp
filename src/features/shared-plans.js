"use strict";

/* Account sessions and published plans use Supabase. The journal stays in IndexedDB. */
const SharedPlans = (() => {
  const plans = "roam_shared_plans";
  const invites = "roam_plan_invites";
  const validId = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
  const listeners = new Set();
  let client, initialization, user = null, ready = false;

  function notify() {
    for (const listener of listeners) listener();
  }

  async function connect() {
    try {
      const response = await fetch("./assets/shared-plans-config.json");
      if (!response.ok) return;
      const config = await response.json();
      if (!config.url || !config.publishableKey) return;
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./assets/supabase.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { detectSessionInUrl: false },
      });
      await new Promise((resolve) => {
        client.auth.onAuthStateChange((event, session) => {
          const next = session?.user;
          const changed = (next?.id || null) !== (user?.id || null) || next?.email !== user?.email;
          user = next?.email ? { id: next.id, email: next.email } : null;
          if (event === "INITIAL_SESSION") resolve();
          // Supabase dispatches auth events while holding its session lock.
          if (ready && changed) setTimeout(notify, 0);
        });
      });
    } catch {
      client = undefined;
    } finally {
      ready = true;
      notify();
    }
  }

  function service() {
    if (!client) throw new Error("Account sharing is unavailable on this site.");
    return client;
  }

  function account() {
    if (!user) throw new Error("Sign in to use shared plans.");
    return user;
  }

  function result({ data, error }, message) {
    if (!error) return data;
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      throw new Error("Too many requests. Wait a minute and try again.");
    }
    if (error.code === "23514" && error.message?.includes("roam_shared_plan_content")) {
      throw new Error("This plan is too large to share. Try shortening the item notes.");
    }
    throw new Error(message);
  }

  const emailAddress = (email) => email.trim().toLowerCase();

  async function requestCode(email) {
    result(
      await service().auth.signInWithOtp({ email: emailAddress(email) }),
      "Couldn’t send a sign-in code. Check the email address and try again.",
    );
  }

  async function verifyCode(email, token) {
    result(
      await service().auth.verifyOtp({ email: emailAddress(email), token, type: "email" }),
      "That code couldn’t be verified. Check it or request a new one.",
    );
  }

  async function signOut() {
    result(await service().auth.signOut({ scope: "local" }), "Couldn’t sign out. Try again.");
  }

  async function list() {
    account();
    const rows = result(
      await service().from(plans)
        .select("id,owner_id,local_trip_id,updated_at,name:plan->>name,start_date:plan->>start,end_date:plan->>end")
        .order("updated_at", { ascending: false }),
      "Couldn’t load shared plans. Try again.",
    );
    return rows.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      localTripId: row.local_trip_id,
      name: row.name || "Trip plan",
      start: row.start_date || "",
      end: row.end_date || "",
      updatedAt: row.updated_at,
    }));
  }

  async function planRow(id, columns) {
    if (!validId.test(id)) return null;
    return result(
      await service().from(plans).select(columns).eq("id", id).maybeSingle(),
      "Couldn’t load this plan. Try again.",
    );
  }

  const revisionFields = "owner_id,revision,roam_plan_invites(can_edit)";
  const canEdit = (row, userId) => row.owner_id === userId ||
    row.roam_plan_invites?.some((invite) => invite.can_edit === true) === true;

  async function get(id) {
    const viewer = account();
    const row = await planRow(id, `id,local_trip_id,plan,updated_at,${revisionFields}`);
    if (!row) return null;
    return {
      id: row.id,
      ownerId: row.owner_id,
      localTripId: row.local_trip_id,
      plan: sharedPlanData(row.plan),
      updatedAt: row.updated_at,
      revision: row.revision,
      canEdit: canEdit(row, viewer.id),
    };
  }

  async function check(id) {
    const viewer = account();
    const row = await planRow(id, revisionFields);
    return row ? { revision: row.revision, canEdit: canEdit(row, viewer.id) } : null;
  }

  async function findOwned(tripId) {
    const owner = account();
    const row = result(
      await service().from(plans).select("id").eq("owner_id", owner.id).eq("local_trip_id", tripId).maybeSingle(),
      "Couldn’t check whether this trip is shared. Try again.",
    );
    return row?.id || null;
  }

  async function listInvites(id) {
    const owner = account();
    const rows = result(
      await service().from(invites).select("email,can_edit").eq("plan_id", id).eq("owner_id", owner.id).order("email"),
      "Couldn’t load invited accounts. Try again.",
    );
    return rows.map((row) => ({ email: row.email, canEdit: row.can_edit }));
  }

  function inviteAddress(email) {
    const owner = account();
    const normalizedEmail = emailAddress(email);
    if (normalizedEmail === emailAddress(owner.email)) {
      throw new Error("Enter the email address of the person you want to invite.");
    }
    return normalizedEmail;
  }

  async function share(trip, email, canEdit) {
    const address = inviteAddress(email);
    return result(
      await service().rpc("share_roam_plan", {
        p_local_trip_id: trip.id,
        p_plan: sharedPlanData(trip),
        p_email: address,
        p_can_edit: canEdit === true,
      }),
      "Couldn’t share this plan. Check the email address and try again.",
    );
  }

  async function edit(id, plan, revision) {
    account();
    return result(
      await service().rpc("edit_roam_plan", {
        p_plan_id: id,
        p_plan: sharedPlanData(plan),
        p_revision: revision,
      }),
      "Couldn’t save the shared plan. Try again.",
    );
  }

  async function invite(id, email, canEdit) {
    const address = inviteAddress(email);
    result(
      await service().rpc("invite_roam_plan", {
        p_plan_id: id,
        p_email: address,
        p_can_edit: canEdit === true,
      }),
      "Couldn’t add this invitation. Check the email address and try again.",
    );
  }

  async function setAccess(id, email, canEdit) {
    const owner = account();
    const row = result(
      await service().from(invites).update({ can_edit: canEdit === true })
        .eq("plan_id", id).eq("owner_id", owner.id).eq("email", emailAddress(email)).select("email").maybeSingle(),
      "Couldn’t change access. Try again.",
    );
    if (!row) throw new Error("This invitation is no longer available.");
  }

  async function revoke(id, email) {
    const owner = account();
    result(
      await service().from(invites).delete().eq("plan_id", id).eq("owner_id", owner.id).eq("email", emailAddress(email)),
      "Couldn’t remove access. Try again.",
    );
  }

  async function remove(id) {
    const owner = account();
    result(
      await service().from(plans).delete().eq("id", id).eq("owner_id", owner.id),
      "Couldn’t stop sharing this plan. Try again.",
    );
  }

  return {
    init: () => (initialization ||= connect()),
    get ready() { return ready; },
    get available() { return Boolean(client); },
    get user() { return user; },
    subscribe(listener) { listeners.add(listener); },
    requestCode, verifyCode, signOut, list, get, check, findOwned, listInvites,
    share, edit, invite, setAccess, revoke, remove,
  };
})();
