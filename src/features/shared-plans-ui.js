"use strict";

/* Account dialogs, shared plans, and invitation management. */
const SharedPlansUI = (() => {
  let startup, accountId, accountEmail, accountReady, accountAvailable, refreshDetail;

  const closeButton = '<button type="button" class="btn" data-action="close-modal">Close</button>';
  const status = '<p class="shared-status" data-shared-status role="status"></p>';
  const shareScope = "The shared plan starts with this trip’s dates, itinerary, saved places, and checklist, including the notes, prices, and links on individual items.";
  const planHash = (id) => "#shared/" + encodeURIComponent(id);
  const modalCurrent = (root) => modal.open && root.isConnected;
  const sharedRoute = () => /^#shared(?:\/|$)/.test(location.hash);

  function updateAccount() {
    const user = SharedPlans.user;
    const nextId = user?.id || null;
    const identityChanged = nextId !== accountId || user?.email !== accountEmail;
    const changed = identityChanged || accountReady !== SharedPlans.ready ||
      accountAvailable !== SharedPlans.available;
    if (identityChanged && modal.open && $("[data-private-share]", modal))
      closeModal();
    accountId = nextId;
    accountEmail = user?.email;
    accountReady = SharedPlans.ready;
    accountAvailable = SharedPlans.available;
    const control = $("#open-account");
    if (control)
      control.textContent = user || (accountReady && !accountAvailable) ? "Account" : "Sign in";
    if (changed && sharedRoute()) render();
  }

  function start() {
    if (startup) return;
    $("#open-account")?.addEventListener("click", () => openAccount());
    window.addEventListener("hashchange", () => {
      if (!sharedRoute()) refreshDetail = undefined;
      if (modal.open && $("[data-private-share]", modal)) closeModal();
    });
    window.addEventListener("focus", () => refreshDetail?.());
    document.addEventListener("visibilitychange", () => refreshDetail?.());
    setInterval(() => refreshDetail?.(), 12000);
    SharedPlans.subscribe(updateAccount);
    startup = Promise.resolve()
      .then(() => SharedPlans.init())
      .catch(() => {})
      .finally(updateAccount);
  }

  function dialog(title, content, footer = closeButton, formId = "") {
    showModal(title, content, footer, formId);
    return $("#modal-content");
  }

  function listen(root, selector, action, statusRoot = root) {
    const control = $(selector, root);
    if (!control) return;
    const isForm = control.tagName === "FORM";
    const userId = SharedPlans.user?.id;
    control.addEventListener(isForm ? "submit" : "click", async (event) => {
      if (isForm) {
        event.preventDefault();
        event.stopPropagation();
      }
      const submit = isForm ? $('button[type="submit"]', control) : control;
      if (submit.disabled || userId !== SharedPlans.user?.id) return;
      const message = $("[data-shared-status]", statusRoot);
      if (message) message.textContent = "";
      submit.disabled = true;
      control.setAttribute("aria-busy", "true");
      try {
        await action(control);
      } catch (error) {
        if (message)
          message.textContent = error.message || "Something interrupted that action. Try again.";
      } finally {
        submit.disabled = false;
        control.removeAttribute("aria-busy");
      }
    });
  }

  function openAccount(afterSignIn) {
    if (!SharedPlans.ready) {
      const root = dialog("Account", '<p data-account-loading role="status">Loading account settings…</p>');
      const marker = $("[data-account-loading]", root);
      startup?.then(() => {
        if (modalCurrent(marker)) openAccount(afterSignIn);
      });
      return;
    }
    if (!SharedPlans.available) {
      dialog("Account", "<p>Account sign-in is unavailable here. You can still plan trips on this device.</p>");
      return;
    }
    if (SharedPlans.user) {
      const root = dialog(
        "Account",
        `<div data-private-share><p>Signed in as <strong class="shared-email">${esc(SharedPlans.user.email)}</strong>.</p>${status}</div>`,
        `<button type="button" class="btn" data-sign-out>Sign out</button><a class="btn btn-primary" href="#shared" data-open-shared>Shared plans</a>`,
      );
      $("[data-open-shared]", root).addEventListener("click", closeModal);
      const marker = $("[data-shared-status]", root);
      listen(root, "[data-sign-out]", async () => {
        await SharedPlans.signOut();
        if (modalCurrent(marker)) closeModal();
        toast("Signed out.");
      });
      return;
    }
    emailDialog(afterSignIn);
  }

  function emailDialog(afterSignIn, email = "") {
    const root = dialog(
      "Sign in",
      `<p>Enter your email address to sign in or create an account.</p>
      ${field("Email address", "email", email, "email", 'required autocomplete="email" maxlength="254"')}${status}`,
      `${closeButton}<button type="submit" class="btn btn-primary">Send code</button>`,
      "shared-email-form",
    );
    $("#field-email", root).focus();
    listen(root, "#shared-email-form", async (form) => {
      const address = new FormData(form).get("email").trim().toLowerCase();
      await SharedPlans.requestCode(address);
      if (modalCurrent(form)) codeDialog(address, afterSignIn);
    });
  }

  function codeDialog(email, afterSignIn) {
    const root = dialog(
      "Check your email",
      `<p>Enter the sign-in code sent to <strong class="shared-email">${esc(email)}</strong>.</p>
      ${field("Sign-in code", "code", "", "text", 'required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" maxlength="10"')}${status}`,
      '<button type="button" class="btn" data-change-email>Change email</button><button type="submit" class="btn btn-primary">Sign in</button>',
      "shared-code-form",
    );
    $("#field-code", root).focus();
    listen(root, "[data-change-email]", () => emailDialog(afterSignIn, email));
    listen(root, "#shared-code-form", async (form) => {
      await SharedPlans.verifyCode(email, new FormData(form).get("code").trim());
      if (modalCurrent(form)) {
        closeModal();
        afterSignIn?.();
      }
      toast("Signed in.");
    });
  }

  function linkControls(root, id) {
    const fallback = $("[data-plan-link-fallback]", root);
    const message = $("[data-shared-status]", root);
    listen(root, "[data-copy-plan-link]", async () => {
      const url = new URL(location.pathname, location.origin);
      url.hash = planHash(id);
      try {
        await navigator.clipboard.writeText(url.href);
        if (fallback.isConnected) message.textContent = "Plan link copied.";
      } catch {
        if (!fallback.isConnected) return;
        fallback.hidden = false;
        const input = $("input", fallback);
        input.value = url.href;
        input.focus();
        input.select();
        message.textContent = "Copy the plan link from the field.";
      }
    });
  }

  const linkButton = '<button type="button" class="btn btn-small" data-copy-plan-link>Copy plan link</button>';
  const linkFallback = '<div class="shared-link-fallback" data-plan-link-fallback hidden><label>Plan link <input type="text" readonly></label></div>';
  const inviteFields = () =>
    field("Invite by email", "invite-email", "", "email", 'required maxlength="254" placeholder="traveler@example.com"') +
    '<div class="form-field"><label for="field-invite-access">Access</label><select id="field-invite-access" name="access"><option value="edit">Can edit</option><option value="view">Can view</option></select></div>';

  async function openShare(trip) {
    if (!trip) return;
    const route = location.hash;
    if (!SharedPlans.user) {
      openAccount(() => {
        if (location.hash === route) openShare(tripById(trip.id));
      });
      return;
    }
    const userId = SharedPlans.user.id;
    const root = dialog("Share plan", '<p data-private-share role="status">Checking for a shared plan…</p>');
    const marker = $("[data-private-share]", root);
    try {
      const id = await SharedPlans.findOwned(trip.id);
      if (modalCurrent(marker) && location.hash === route && SharedPlans.user?.id === userId) {
        if (id) sharedLinkDialog(id);
        else shareDialog(trip.id);
      }
    } catch (error) {
      if (modalCurrent(marker)) marker.textContent = error.message;
    }
  }

  function sharedLinkDialog(id, confirmation = "") {
    const root = dialog(
      "Share plan",
      `<div data-private-share class="shared-form"><p>Open the shared plan to edit it together or manage invitations.</p>
      <div class="shared-actions">${linkButton}<a class="btn btn-small btn-primary" href="${planHash(id)}" data-manage-plan>Open shared plan</a></div>${linkFallback}${status}</div>`,
    );
    $("[data-shared-status]", root).textContent = confirmation;
    linkControls(root, id);
    $("[data-manage-plan]", root).addEventListener("click", closeModal);
    $(confirmation ? "[data-copy-plan-link]" : "[data-manage-plan]", root)?.focus();
  }

  function shareDialog(tripId) {
    const trip = tripById(tripId);
    if (!trip) return;
    const root = dialog(
      "Share plan",
      `<div data-private-share class="shared-form"><p><strong>${esc(trip.name)}</strong></p>
      <p>${shareScope}</p>${inviteFields()}
      ${status}</div>`,
      `${closeButton}<button type="submit" class="btn btn-primary">Add invite</button>`,
      "share-trip-form",
    );
    const marker = $("[data-private-share]", root);
    listen(root, "#share-trip-form", async (form) => {
      const current = tripById(tripId);
      if (!current) throw new Error("This trip is unavailable on this device.");
      const values = new FormData(form);
      const email = values.get("invite-email").trim().toLowerCase();
      const sharedId = await SharedPlans.share(current, email, values.get("access") === "edit");
      if (modalCurrent(marker))
        sharedLinkDialog(sharedId, `Access added for ${email}. Copy the plan link and send it to them.`);
    });
    $("#field-invite-email", root)?.focus();
  }

  function notice(root, title, message, action = "", label = "") {
    root.innerHTML = `<section class="empty"><h2>${title}</h2><p>${esc(message)}</p>${action ? `<button type="button" class="btn btn-primary" ${action}>${label}</button>` : ""}</section>`;
  }

  function updated(value) {
    const date = new Date(value);
    return value && Number.isFinite(date.getTime())
      ? `<time datetime="${esc(date.toISOString())}">${esc(date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }))}</time>`
      : "";
  }

  function planSection(title, rows, emptyText, className = "") {
    return `<section class="panel shared-section"><h2>${title}</h2>${rows.length ? `<ul class="shared-plan-rows ${className}">${rows.join("")}</ul>` : `<p class="muted">${emptyText}</p>`}</section>`;
  }

  function planFacts(item) {
    const facts = [
      ["Category", item.category],
      ["Area", item.district],
      ["Location", item.location],
      ["Cost", item.cost],
      ["Hours", item.hours],
      ["Getting there", item.access],
    ].filter(([, value]) => value);
    const links = [[item.website, "Website"], [item.mapLink, "Map"]]
      .filter(([url]) => /^https?:\/\//i.test(url))
      .map(([url, label]) => `<a class="text-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} ${ico("arrow", 12)}</a>`);
    return `${facts.length ? `<dl class="shared-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>` : ""}
      ${item.note ? `<p class="shared-note">${esc(item.note)}</p>` : ""}
      ${links.length ? `<div class="shared-actions">${links.join("")}</div>` : ""}`;
  }

  function showPlan(root, entry, owned, current) {
    const t = entry.plan;
    const itinerary = [...t.itinerary]
      .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") ||
        (a.time || "99:99").localeCompare(b.time || "99:99"))
      .map((item) => {
        const start = TripCalendar.minutes(item.time);
        const time = start === null ? "" : ` · ${TripCalendar.clock(start)}–${TripCalendar.clock(start + item.duration)}`;
        return `<li><h3>${esc(item.title)}</h3><p class="muted">${item.date ? fmtDate(item.date) : "Date not set"}${time}</p>${planFacts(item)}</li>`;
      });
    const places = t.placesToExplore.map(
      (place) => `<li><h3>${esc(place.name)}</h3>${planFacts(place)}</li>`,
    );
    const checklist = t.checklist.map(
      (item) => `<li class="shared-check">${ico(item.done ? "check" : "flag", 15)}<span>${esc(item.title)}</span><span class="muted">${item.done ? "Done" : "To do"}</span></li>`,
    );
    const lastUpdate = updated(entry.updatedAt);
    root.innerHTML = `<a class="text-link back-link" href="#shared">${ico("back", 14)} All shared plans</a>
      <div class="shared-plan-hero panel"><div class="shared-plan-art">${Art.scene(t.scene)}</div>
      <div><p class="eyebrow">${ico("pin", 14)} ${esc(t.country || "Destination")}</p>
      <h2>${esc(t.name)}</h2><p>${dateRange(t)}</p>
      <p class="muted">${owned ? "You own this plan" : entry.canEdit ? "You can edit this plan" : "View only"}${lastUpdate ? ` · Updated ${lastUpdate}` : ""}</p>
      ${entry.canEdit ? '<div class="shared-actions"><button type="button" class="btn btn-small btn-primary" data-edit-shared-plan>Edit shared plan</button></div>' : ""}</div></div>
      ${owned ? '<section class="panel shared-section" data-shared-owner></section>' : ""}
      ${planSection("Itinerary", itinerary, "No itinerary items yet.")}
      ${planSection("Saved places", places, "No saved places yet.", "shared-places")}
      ${planSection("Checklist", checklist, "No checklist tasks yet.")}`;
    listen(root, "[data-edit-shared-plan]", () => {
      SharedPlanEditor.open(entry, {
        isCurrent: current,
        onSaved: () => render(entry.id, true),
      });
    });
    if (owned) ownerPanel($("[data-shared-owner]", root), entry, current);
  }

  function ownerPanel(panel, entry, current) {
    const localTrip = state?.trips.find((trip) => trip.id === entry.localTripId);
    panel.innerHTML = `<h2>Manage access</h2><p>People sign in with their invited email address to open the plan.</p>
      <div class="shared-actions"><button class="btn btn-small" type="button" data-add-invite>Add invite</button>${linkButton}
      ${localTrip ? `<a class="text-link" href="#planner/${esc(localTrip.id)}">Open local trip</a>` : ""}
      <button class="btn btn-small danger" type="button" data-stop-sharing>Stop sharing</button></div>${linkFallback}
      <div data-invited-accounts role="group" aria-label="Invited email addresses"></div>${status}`;
    linkControls(panel, entry.id);
    listen(panel, "[data-add-invite]", () => {
      const root = dialog(
        "Add invite",
        `<div data-private-share class="shared-form">${inviteFields()}${status}</div>`,
        `${closeButton}<button type="submit" class="btn btn-primary">Add invite</button>`,
        "shared-invite-form",
      );
      const marker = $("[data-private-share]", root);
      $("#field-invite-email", root)?.focus();
      listen(root, "#shared-invite-form", async (form) => {
        const values = new FormData(form);
        const email = values.get("invite-email").trim().toLowerCase();
        await SharedPlans.invite(entry.id, email, values.get("access") === "edit");
        if (modalCurrent(marker)) closeModal();
        if (current() && panel.isConnected) {
          invitedAccounts(panel, entry.id, current);
          $("[data-shared-status]", panel).textContent = `Access added for ${email}. Copy the plan link and send it to them.`;
        }
      });
    });
    listen(panel, "[data-stop-sharing]", () => {
      const root = dialog(
        "Stop sharing this plan?",
        `<div data-private-share><p>This deletes the shared plan and its changes. Invited accounts will lose access to the link.</p>${status}</div>`,
        `${closeButton}<button type="button" class="btn danger" data-confirm-stop>Stop sharing</button>`,
      );
      const marker = $("[data-private-share]", root);
      listen(root, "[data-confirm-stop]", async () => {
        await SharedPlans.remove(entry.id);
        if (modalCurrent(marker)) closeModal();
        if (current()) navigate("#shared");
        toast("Sharing stopped.");
      });
    });
    invitedAccounts(panel, entry.id, current);
  }

  async function invitedAccounts(panel, id, current) {
    const region = $("[data-invited-accounts]", panel);
    region.innerHTML = '<p role="status">Loading invites…</p>';
    try {
      const accounts = await SharedPlans.listInvites(id);
      if (!current() || !region.isConnected) return;
      region.innerHTML = accounts.length
        ? `<ul class="shared-invites">${accounts.map(({ email, canEdit }) => `<li><div><span class="shared-email">${esc(email)}</span><p class="muted" data-invite-access>${canEdit ? "Can edit" : "Can view"}</p></div><div class="shared-actions"><button type="button" class="btn btn-small" data-change-access>${canEdit ? "Make view only" : "Allow editing"}</button><button type="button" class="btn btn-small" data-revoke-access aria-label="Revoke access for ${esc(email)}">Revoke access</button></div></li>`).join("")}</ul>`
        : "<p>No invited email addresses.</p>";
      region.querySelectorAll("li").forEach((row, index) => {
        const { email } = accounts[index];
        let { canEdit } = accounts[index];
        const change = $("[data-change-access]", row);
        function labelAccess() {
          change.textContent = canEdit ? "Make view only" : "Allow editing";
          change.setAttribute("aria-label", `${change.textContent} for ${email}`);
        }
        labelAccess();
        listen(row, "[data-change-access]", async () => {
          await SharedPlans.setAccess(id, email, !canEdit);
          if (current() && row.isConnected) {
            canEdit = !canEdit;
            $("[data-invite-access]", row).textContent = canEdit ? "Can edit" : "Can view";
            labelAccess();
            $("[data-shared-status]", panel).textContent = `Access updated for ${email}.`;
          }
        }, panel);
        listen(row, "[data-revoke-access]", async () => {
          await SharedPlans.revoke(id, email);
          if (current() && row.isConnected) {
            row.remove();
            if (!region.querySelector("li")) region.innerHTML = "<p>No invited email addresses.</p>";
            toast(`Access revoked for ${email}.`);
          }
        }, panel);
      });
    } catch (error) {
      if (current() && region.isConnected) region.textContent = error.message;
    }
  }

  function showList(root, plans, userId) {
    if (!plans.length) {
      notice(root, "No shared plans yet", "Open one of your trips in the planner to share it.");
      return;
    }
    root.innerHTML = `<ul class="shared-plan-list">${plans.map((plan) => {
      const lastUpdate = updated(plan.updatedAt);
      return `<li class="panel shared-plan-list-item"><div><h2>${esc(plan.name)}</h2>
        <p>${esc(dateRange(plan))}</p><p class="muted">${plan.ownerId === userId ? "You shared this plan" : "Shared with you"}${lastUpdate ? ` · Updated ${lastUpdate}` : ""}</p></div>
        <a class="btn btn-small" href="${planHash(plan.id)}">Open plan ${ico("arrow", 13)}</a></li>`;
    }).join("")}</ul>`;
  }

  async function render(id = location.hash.split("/")[1], focusEditor = false) {
    refreshDetail = undefined;
    const route = location.hash;
    main.innerHTML = `<section class="shared-view" aria-labelledby="shared-view-title">
      <div class="section-title"><h1 id="shared-view-title" tabindex="-1">Shared plans</h1><a href="#planner" class="text-link">Trip planner ${ico("arrow", 14)}</a></div>
      <div data-shared-view></div></section>`;
    const root = $("[data-shared-view]", main);
    const viewer = SharedPlans.user;
    const userId = viewer?.id;
    const current = () => root.isConnected && location.hash === route &&
      SharedPlans.user?.id === userId && SharedPlans.user?.email === viewer?.email;
    if (!SharedPlans.ready) {
      root.innerHTML = '<p class="loading-state" role="status">Connecting to your account…</p>';
      return;
    }
    if (!SharedPlans.available) {
      notice(root, "Sharing is unavailable", "You can plan trips in this browser while sharing is unavailable.");
      return;
    }
    if (!userId) {
      notice(
        root,
        id ? "Sign in to open this plan" : "Sign in to see shared plans",
        id ? "Use the email address that received the invitation." : "Use your email to view plans you have shared or been invited to.",
        "data-shared-sign-in",
        "Sign in",
      );
      listen(root, "[data-shared-sign-in]", () => openAccount());
      return;
    }
    root.innerHTML = '<p class="loading-state" role="status">Loading shared plans…</p>';
    try {
      if (id) {
        await renderDetail(root, id, userId, current, focusEditor);
      } else {
        const plans = await SharedPlans.list();
        if (current()) showList(root, plans, userId);
      }
    } catch (error) {
      if (!current()) return;
      notice(root, "Couldn’t open shared plans", error.message, "data-retry-shared", "Try again");
      listen(root, "[data-retry-shared]", () => render(id));
    }
  }

  async function renderDetail(root, id, userId, current, focusEditor) {
    let entry = await SharedPlans.get(id);
    if (!current()) return;

    function display(focus) {
      if (entry) showPlan(root, entry, entry.ownerId === userId, current);
      else notice(root, "Plan unavailable", "Ask the person who shared the plan to check the link and your invited email address.");
      if (focus) ($("[data-edit-shared-plan]", root) || $(".back-link", root) || $("#shared-view-title", main))?.focus();
    }

    display(focusEditor);
    if (!entry) return;

    let checking = false;
    const refreshAllowed = () => current() && !document.hidden && !modal.open &&
      !document.activeElement?.closest("[data-shared-owner]") &&
      !$('[data-shared-owner] [aria-busy="true"]', root);
    refreshDetail = async () => {
      if (checking || !refreshAllowed()) return;
      checking = true;
      try {
        const latest = await SharedPlans.check(id);
        if (!refreshAllowed()) return;
        if (latest?.revision === entry.revision && latest?.canEdit === entry.canEdit) return;

        const updatedEntry = latest ? await SharedPlans.get(id) : null;
        if (!refreshAllowed()) return;
        const hadFocus = root.contains(document.activeElement);
        entry = updatedEntry;
        if (!entry) refreshDetail = undefined;
        display(hadFocus);
      } catch {
        // Keep the displayed plan during a temporary connection failure. The next check retries.
      } finally {
        checking = false;
      }
    };
  }

  return { start, render, openAccount, openShare };
})();
