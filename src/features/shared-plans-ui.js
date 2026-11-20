"use strict";

/* Account dialogs and the read-only shared plan views. */
const SharedPlansUI = (() => {
  let startup, accountId, accountReady, accountAvailable;

  const closeButton = '<button type="button" class="btn" data-action="close-modal">Close</button>';
  const status = '<p class="shared-status" data-shared-status role="status"></p>';
  const shareScope = "The shared copy includes dates, itinerary, saved places, and checklist, including the notes, prices, and links on individual items. It updates when you publish from this device.";
  const planHash = (id) => "#shared/" + encodeURIComponent(id);
  const modalCurrent = (root) => modal.open && root.isConnected;
  const sharedRoute = () => /^#shared(?:\/|$)/.test(location.hash);

  function updateAccount() {
    const user = SharedPlans.user;
    const nextId = user?.id || null;
    const changed = nextId !== accountId || accountReady !== SharedPlans.ready ||
      accountAvailable !== SharedPlans.available;
    if (nextId !== accountId && modal.open && $("[data-private-share]", modal))
      closeModal();
    accountId = nextId;
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
      if (modal.open && $("[data-private-share]", modal)) closeModal();
    });
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
    const root = dialog("Share plan", '<p data-private-share role="status">Checking for a shared copy…</p>');
    const marker = $("[data-private-share]", root);
    try {
      const existing = (await SharedPlans.list()).find(
        (plan) => plan.ownerId === userId && plan.localTripId === trip.id,
      );
      if (modalCurrent(marker) && location.hash === route && SharedPlans.user?.id === userId)
        shareDialog(trip.id, existing?.id);
    } catch (error) {
      if (modalCurrent(marker)) marker.textContent = error.message;
    }
  }

  function shareDialog(tripId, id, confirmation = "") {
    const trip = tripById(tripId);
    if (!trip) return;
    const root = dialog(
      "Share plan",
      `<div data-private-share class="shared-form"><p><strong>${esc(trip.name)}</strong></p>
      <p>${shareScope}</p><p>Adding an invite publishes the latest version. Invitees can view it by signing in with the email you enter.</p>
      ${field("Invite by email", "invite-email", "", "email", 'required maxlength="254" placeholder="traveler@example.com"')}
      ${id ? `<div class="shared-actions">${linkButton}<button type="button" class="btn btn-small" data-publish-plan>Publish latest changes</button><a class="text-link" href="${planHash(id)}" data-manage-plan>Manage access</a></div>${linkFallback}` : ""}
      ${status}</div>`,
      `${closeButton}<button type="submit" class="btn btn-primary">Add invite</button>`,
      "share-trip-form",
    );
    const marker = $("[data-private-share]", root);
    $("[data-shared-status]", root).textContent = confirmation;
    if (id) {
      linkControls(root, id);
      $("[data-manage-plan]", root).addEventListener("click", () => {
        closeModal();
        if (location.hash === planHash(id)) render(id);
      });
      listen(root, "[data-publish-plan]", async () => {
        const current = tripById(tripId);
        if (!current) throw new Error("This trip is unavailable on this device.");
        await SharedPlans.publish(id, current);
        if (modalCurrent(marker)) {
          $("[data-shared-status]", root).textContent = "Latest changes published.";
          if (sharedRoute()) render();
        }
      });
    }
    listen(root, "#share-trip-form", async (form) => {
      const current = tripById(tripId);
      if (!current) throw new Error("This trip is unavailable on this device.");
      const email = new FormData(form).get("invite-email").trim().toLowerCase();
      const sharedId = await SharedPlans.share(current, email);
      if (modalCurrent(marker)) {
        shareDialog(tripId, sharedId, `Access added for ${email}. Copy the plan link and send it to them.`);
        if (sharedRoute()) render();
      }
    });
    const focus = confirmation ? "[data-copy-plan-link]" : "#field-invite-email";
    $(focus, root)?.focus();
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
      <p class="muted">${owned ? "Your shared copy" : "Shared with you"}${lastUpdate ? ` · Updated ${lastUpdate}` : ""}</p></div></div>
      ${owned ? '<section class="panel shared-section" data-shared-owner></section>' : ""}
      ${planSection("Itinerary", itinerary, "No itinerary items yet.")}
      ${planSection("Saved places", places, "No saved places yet.", "shared-places")}
      ${planSection("Checklist", checklist, "No checklist tasks yet.")}`;
    if (owned) ownerPanel($("[data-shared-owner]", root), entry, current);
  }

  function ownerPanel(panel, entry, current) {
    const localTrip = state?.trips.find((trip) => trip.id === entry.localTripId);
    panel.innerHTML = `<h2>Manage access</h2><p>People you invite can open this plan after signing in with their invited email address.</p>
      <div class="shared-actions">${linkButton}${localTrip ? `<button class="btn btn-small" type="button" data-open-local>Invite or publish changes</button>
      <a class="btn btn-small" href="#planner/${esc(localTrip.id)}">Open trip planner</a>` : ""}
      <button class="btn btn-small danger" type="button" data-stop-sharing>Stop sharing</button></div>${linkFallback}
      <div data-invited-accounts role="group" aria-label="Invited email addresses"></div>${status}`;
    linkControls(panel, entry.id);
    if (localTrip)
      listen(panel, "[data-open-local]", () => openShare(tripById(localTrip.id)));
    listen(panel, "[data-stop-sharing]", () => {
      const root = dialog(
        "Stop sharing this plan?",
        `<div data-private-share><p>Invited accounts will lose access to this plan link.</p>${status}</div>`,
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
      if (!current()) return;
      region.innerHTML = accounts.length
        ? `<ul class="shared-invites">${accounts.map((email) => `<li><span class="shared-email">${esc(email)}</span><button type="button" class="btn btn-small" aria-label="Revoke access for ${esc(email)}">Revoke access</button></li>`).join("")}</ul>`
        : "<p>No invited email addresses.</p>";
      region.querySelectorAll("li").forEach((row, index) => {
        listen(row, "button", async () => {
          const email = accounts[index];
          await SharedPlans.revoke(id, email);
          if (current() && row.isConnected) {
            row.remove();
            if (!region.querySelector("li")) region.innerHTML = "<p>No invited email addresses.</p>";
            toast(`Access revoked for ${email}.`);
          }
        }, panel);
      });
    } catch (error) {
      if (current()) region.textContent = error.message;
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
        <p>${dateRange(plan)}</p><p class="muted">${plan.ownerId === userId ? "You shared this plan" : "Shared with you"}${lastUpdate ? ` · Updated ${lastUpdate}` : ""}</p></div>
        <a class="btn btn-small" href="${planHash(plan.id)}">Open plan ${ico("arrow", 13)}</a></li>`;
    }).join("")}</ul>`;
  }

  async function render(id = location.hash.split("/")[1]) {
    const route = location.hash;
    main.innerHTML = `<section class="shared-view" aria-labelledby="shared-view-title">
      <div class="section-title"><h1 id="shared-view-title">Shared plans</h1><a href="#planner" class="text-link">Trip planner ${ico("arrow", 14)}</a></div>
      <div data-shared-view></div></section>`;
    const root = $("[data-shared-view]", main);
    const userId = SharedPlans.user?.id;
    const current = () => root.isConnected && location.hash === route && SharedPlans.user?.id === userId;
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
        const plan = await SharedPlans.get(id);
        if (!current()) return;
        if (plan) showPlan(root, plan, plan.ownerId === userId, current);
        else notice(root, "Plan unavailable", "Ask the person who shared the plan to check the link and your invited email address.");
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

  return { start, render, openAccount, openShare };
})();
