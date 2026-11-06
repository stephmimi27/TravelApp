/* Planning views inspired by the owner's research lists, day grids and budgets. */
const Planner = (() => {
  let activeTab = "itinerary",
    layout = "overview";
  const categories = PlaceLibrary.categories;
  const planned = (e) => Number(e.planned ?? e.amount ?? 0) || 0;
  const actual = (e) => Number(e.actual ?? e.amount ?? 0) || 0;
  const url = (v) => (/^https?:\/\//i.test(v || "") ? esc(v) : "");
  const mapLink = (p) =>
    url(p.mapLink) ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location || p.name || p.title || "")}`;
  const categoryOptions = (v) =>
    categories
      .map((c) => `<option ${v === c ? "selected" : ""}>${c}</option>`)
      .join("");
  function render(id) {
    TripCalendar.capture();
    TripCalendar.cancelDrag();
    const plans = state.trips.filter(
        (t) => t.status !== "visited" || t.id === id,
      ),
      t =
        plans.find((p) => p.id === id) ||
        plans.find((p) => p.status === "upcoming") ||
        plans[0];
    main.innerHTML =
      pageHero(
        "TRIP PLANNER",
        "Plan your itinerary",
        "Save places, then drag them onto your calendar to set dates and times.",
        button(
          "Add a trip",
          "add-trip",
          "plus",
          'data-status="upcoming"',
          "btn-primary",
        ),
      ) +
      (t
        ? `<div class="planner-layout planner-calendar-layout"><aside class="trip-list" aria-label="Choose a trip">${plans.map((p) => `<a class="plan-choice ${p.id === t.id ? "active" : ""}" href="#planner/${esc(p.id)}" ${p.id === t.id ? 'aria-current="page"' : ""}><h3>${esc(p.name)}</h3><p>${dateRange(p)}</p><span class="tag ${p.status === "wishlist" ? "gold" : "mint"}">${p.status === "wishlist" ? "WISHLIST" : p.status === "visited" ? "PAST TRIP" : "UPCOMING"}${p.demo ? " · SAMPLE" : ""}</span></a>`).join("")}${button("Add a trip", "add-trip", "plus", 'data-status="upcoming"', "btn-ghost")}</aside><div class="planner-main"><div class="plan-header">${Art.scene(t.scene)}<div class="plan-header-text"><div class="eyebrow">${ico("plane", 13)}${esc(daysAway(t))}</div><h2>${esc(t.name)}, ${esc(t.country)}</h2><p>${dateRange(t)}</p>${button("Trip details", "edit-trip", "edit", `data-trip="${esc(t.id)}"`, "btn-small")}</div></div><nav class="planner-tabs" aria-label="Trip planning views">${[
            ["itinerary", "calendar", "The itinerary"],
            ["places", "pin", "Places to explore"],
            ["budget", "book", "Budget & spending"],
          ]
            .map(
              ([v, i, l]) =>
                `<button data-action="planner-tab" data-tab="${v}" data-trip="${esc(t.id)}" class="${activeTab === v ? "active" : ""}" aria-pressed="${activeTab === v}">${ico(i, 15)}${l}${v === "places" ? ` <small>${(t.places || []).length}</small>` : ""}</button>`,
            )
            .join(
              "",
            )}</nav><div id="planner-view">${activeTab === "places" ? placesView(t) : activeTab === "budget" ? budgetView(t) : itineraryView(t)}</div></div></div>`
        : empty(
            "No trips to plan",
            "Add an upcoming trip or a wishlist destination.",
            "add-plan",
            "Add a trip",
          )) +
      demoNotice();
    if (t && activeTab === "itinerary") itinerary(t);
  }
  function itineraryView(t) {
    return `<div class="plan-workspace"><section class="itinerary-workspace">${TripCalendar.render(t)}</section><div class="planning-bottom"><section class="panel plan-section"><div class="section-title"><h2>${ico("check", 17)} Checklist</h2><span class="tag mint">${ready(t)}</span></div><div class="progress"><span style="width:${t.checklist.length ? (t.checklist.filter((c) => c.done).length / t.checklist.length) * 100 : 0}%"></span></div><div class="checklist">${t.checklist.map((c) => `<div class="check-item ${c.done ? "checked" : ""}"><button class="checkbox ${c.done ? "checked" : ""}" data-action="toggle-check" data-trip="${esc(t.id)}" data-id="${esc(c.id)}" aria-label="${esc(c.title)}" aria-pressed="${!!c.done}">${c.done ? ico("check", 12) : ""}</button><span>${esc(c.title)}</span><button class="remove" data-action="remove-check" data-trip="${esc(t.id)}" data-id="${esc(c.id)}" aria-label="Remove ${esc(c.title)}">×</button></div>`).join("") || '<p class="field-hint">Add booking, transport, or packing tasks.</p>'}</div><form class="inline-form" id="checklist-form" data-trip="${esc(t.id)}"><input name="title" required maxlength="100" placeholder="Add a task" aria-label="New checklist task"><button aria-label="Add task">+</button></form></section><section class="panel plan-section"><div class="section-title"><h2>Budget</h2><button class="text-link" data-action="planner-tab" data-tab="budget" data-trip="${esc(t.id)}">View budget ${ico("arrow", 13)}</button></div>${budget(t)}<div class="plan-note"><label for="plan-notes">Trip notes</label><textarea id="plan-notes" placeholder="Reservations, transport details, or other notes">${esc(TripCalendar.noteValue(t))}</textarea><button class="text-link note-save" data-action="save-notes" data-trip="${esc(t.id)}">Save notes ${ico("check", 12)}</button><div style="clear:both"></div></div><div style="margin-top:17px">${button(t.status === "visited" ? "View memories" : t.status === "wishlist" ? "Move to upcoming trips" : "Mark trip complete", t.status === "visited" ? "open-trip" : "complete-trip", "flag", `data-trip="${esc(t.id)}"`, "btn-green btn-full")}</div></section></div></div>`;
  }
  function itinerary(t) {
    TripCalendar.mount(t);
  }
  function placesView(t) {
    return PlaceLibrary.render(t);
  }
  function budget(t) {
    const spend = t.expenses.reduce((s, e) => s + actual(e), 0),
      plan = t.expenses.reduce((s, e) => s + planned(e), 0);
    return `<div class="mini-budget"><div><span>Planned</span><strong>${money(plan, t.currency)}</strong></div><div><span>Actual</span><strong>${money(spend, t.currency)}</strong></div></div><div class="progress"><span style="width:${t.budget ? Math.min((spend / t.budget) * 100, 100) : 0}%;${spend > t.budget && t.budget ? "background:#c89796" : ""}"></span></div><p class="budget-status ${spend > t.budget && t.budget ? "over" : ""}">${t.budget ? `${money(Math.abs(t.budget - spend), t.currency)} ${spend > t.budget ? "over budget" : "left"} · ${money(t.budget, t.currency)} trip budget` : "Set a trip budget in Trip details."}</p>`;
  }
  function budgetView(t) {
    const ps = t.expenses.reduce((n, e) => n + planned(e), 0),
      as = t.expenses.reduce((n, e) => n + actual(e), 0),
      groups = [
        ...new Set(t.expenses.map((e) => e.category || "Miscellaneous")),
      ];
    return `<section class="panel plan-section"><div class="section-title"><div><h2>Budget & spending</h2><p class="field-hint" style="margin-top:6px">What you expect to spend, and what you actually do.</p></div>${button("Add an expense", "add-expense", "plus", `data-trip="${esc(t.id)}"`, "btn-primary btn-small")}</div><div class="budget-summary"><div><span>Trip budget</span><strong>${money(t.budget, t.currency)}</strong><button class="text-link" data-action="edit-trip" data-trip="${esc(t.id)}">Edit budget</button></div><div><span>Planned spending</span><strong>${money(ps, t.currency)}</strong></div><div><span>Actual spending</span><strong>${money(as, t.currency)}</strong></div><div><span>Planned − actual</span><strong>${money(ps - as, t.currency)}</strong></div></div><div class="research-table-wrap"><table class="research-table expense-table"><thead><tr><th>Category / day</th><th>Details</th><th>Planned</th><th>Actual</th><th></th></tr></thead><tbody>${t.expenses.map((e) => `<tr><td><span class="tag">${esc(e.category || "Miscellaneous")}</span><small>${e.date ? fmtDate(e.date) : "Whole trip"}</small></td><td><strong>${esc(e.label)}</strong></td><td>${money(planned(e), t.currency)}</td><td>${money(actual(e), t.currency)}</td><td><div class="item-tools"><button data-action="edit-expense" data-trip="${esc(t.id)}" data-id="${esc(e.id)}" aria-label="Edit ${esc(e.label)}">${ico("edit", 14)}</button><button data-action="remove-expense" data-trip="${esc(t.id)}" data-id="${esc(e.id)}" aria-label="Remove ${esc(e.label)}">${ico("close", 14)}</button></div></td></tr>`).join("") || '<tr><td colspan="5" class="field-hint">No expenses yet. Start with an estimate, then add actual spending as you go.</td></tr>'}</tbody><tfoot><tr><th colspan="2">Your trip total</th><th>${money(ps, t.currency)}</th><th>${money(as, t.currency)}</th><th></th></tr></tfoot></table></div>${
      groups.length
        ? `<div class="category-totals">${groups
            .map((c) => {
              const items = t.expenses.filter(
                (e) => (e.category || "Miscellaneous") === c,
              );
              return `<div><span>${esc(c)}</span><strong>${money(
                items.reduce((n, e) => n + actual(e), 0),
                t.currency,
              )}</strong><small>of ${money(
                items.reduce((n, e) => n + planned(e), 0),
                t.currency,
              )} planned</small></div>`;
            })
            .join("")}</div>`
        : ""
    }<div class="section-title" style="margin-bottom:0"><p class="field-hint">Every amount uses ${esc(t.currency)}. Currency labels don’t convert amounts.</p><button class="text-link" data-action="export-budget" data-trip="${esc(t.id)}">${ico("download", 13)} Export for Sheets</button></div></section>`;
  }
  function placeForm(t, id = "") {
    const p = (t.places || []).find((p) => p.id === id) || {
      name: "",
      category: "Activities",
      district: "",
      location: "",
      cost: "",
      hours: "",
      website: "",
      mapLink: "",
      note: "",
      access: "",
    };
    showModal(
      id ? "Edit place" : "Save a place to explore",
      `<div class="form-grid">${field("Place / attraction", "name", p.name, "text", 'required maxlength="160"', true)}<div class="form-field"><label for="place-category">Category</label><select id="place-category" name="category">${categoryOptions(p.category)}</select></div>${field("District / neighborhood", "district", p.district, "text", 'maxlength="120"')}${field("Location / address", "location", p.location, "text", 'maxlength="500"', true)}${field("Cost / price range", "cost", p.cost, "text", 'maxlength="250" placeholder="Free, $15–25, by donation…"')}${field("Opening hours", "hours", p.hours, "text", 'maxlength="500" placeholder="Keep your researched hours here"')}${field("Website / booking link", "website", p.website, "url", 'maxlength="2000"')}${field("Google Maps link (optional)", "mapLink", p.mapLink, "url", 'maxlength="2000"')}${field("Getting there", "access", p.access, "text", 'maxlength="200" placeholder="Transit, car, walk, reservation…"', true)}<div class="form-field full"><label for="place-note">Notes</label><textarea name="note" id="place-note" maxlength="4000" placeholder="Reservations, recommendations, or other details">${esc(p.note)}</textarea></div></div>`,
      `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">${ico("pin", 15)} Save place</button>`,
      "place-form",
    );
    $("#place-form").dataset.trip = t.id;
    $("#place-form").dataset.id = id;
  }
  function expenseForm(t, id = "") {
    const e = t.expenses.find((e) => e.id === id) || {
      label: "",
      date: "",
      category: "Food",
      planned: "",
      actual: "",
    };
    showModal(
      id ? "Edit expense" : "Add expense",
      `<div class="form-grid">${field("Details", "label", e.label, "text", 'required maxlength="100"', true)}<div class="form-field"><label for="expense-category">Category</label><select name="category" id="expense-category">${categoryOptions(e.category || "Miscellaneous")}</select></div>${field("Day (optional)", "date", e.date, "date")}${field(`Planned (${t.currency})`, "planned", id ? planned(e) : "", "number", 'min="0" max="100000000" step="0.01"')}${field(`Actual (${t.currency})`, "actual", id ? actual(e) : "", "number", 'min="0" max="100000000" step="0.01"')}<p class="field-hint" style="grid-column:1/-1">Start with what you expect to spend. Update the actual amount later.</p></div>`,
      `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">Save expense</button>`,
      "tracked-expense-form",
    );
    $("#tracked-expense-form").dataset.trip = t.id;
    $("#tracked-expense-form").dataset.id = id;
  }
  function pasteForm(t) {
    showModal(
      "Import from Sheets",
      `<p>Copy your rows from a spreadsheet and paste them below. Your row order, notes, and links stay together.</p><div class="form-field"><span>Column order</span><p id="paste-layout" class="field-hint">Name · Category · Map · Hours · Cost · Website · Notes</p></div><div class="form-field" style="margin-top:17px"><label for="paste-data">Your copied rows</label><textarea id="paste-data" name="rows" required maxlength="1000000" style="min-height:190px" placeholder="Paste a table from Sheets here…"></textarea><span class="field-hint">Headers are optional. Import up to 500 rows at a time. You can add a district after importing.</span></div>`,
      `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">Save these places</button>`,
      "paste-places-form",
    );
    $("#paste-places-form").dataset.trip = t.id;
  }
  function parseTSV(text) {
    let rows = [],
      row = [],
      cell = "",
      quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && (quoted || cell === "")) {
        if (quoted && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (!quoted && (c === "\t" || c === "\n")) {
        row.push(cell);
        cell = "";
        if (c === "\n") {
          if (row.some((c) => c.trim())) rows.push(row);
          row = [];
        }
      } else if (c !== "\r" || quoted) cell += c;
    }
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
    return rows;
  }
  function downloadRows(rows, name, headers) {
    if (!rows.length) {
      toast("There’s nothing to export yet.");
      return;
    }
    const quote = (v) => {
      const s = String(v ?? "");
      return /[\t\n\r"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const output = headers ? [headers, ...rows] : rows;
    const blob = new Blob(
        ["\ufeff" + output.map((r) => r.map(quote).join("\t")).join("\r\n")],
        { type: "text/tab-separated-values;charset=utf-8" },
      ),
      link = document.createElement("a"),
      u = URL.createObjectURL(blob);
    link.href = u;
    link.download = `roam-${name.replace(/[^a-z0-9-]/gi, "-")}.tsv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(u), 10000);
    toast(headers ? "Ready for Sheets — column headers are included." : "Ready for Sheets — rows are exported without headers.");
  }
  async function action(a, { target, t, tid, id }) {
    if (a === "planner-tab") {
      activeTab = target.dataset.tab;
      render(tid);
      return true;
    }
    if (a === "itinerary-layout") {
      layout = target.dataset.layout;
      render(tid);
      return true;
    }
    if (a === "select-day") {
      layout = "day";
      selectedDay[tid] = target.dataset.date;
      render(tid);
      return true;
    }
    if (a === "day-add-stop") {
      selectedDay[tid] = target.dataset.date;
      openStopForm(tid);
      return true;
    }
    if (a === "add-place" || a === "edit-place" || a === "new-place") {
      const trip =
        t ||
        tripById(location.hash.split("/")[1]) ||
        state.trips.find((t) => t.status !== "visited");
      if (trip) placeForm(trip, id);
      return true;
    }
    if (a === "remove-place") {
      await mutate((s) => {
        const trip = s.trips.find((p) => p.id === tid);
        trip.places = (trip.places || []).filter((p) => p.id !== id);
      }, "Place removed from your research. Scheduled stops are kept.");
      return true;
    }
    if (a === "schedule-place") {
      openStopForm(tid, "", id);
      return true;
    }
    if (a === "paste-places") {
      pasteForm(t);
      return true;
    }
    if (a === "add-expense" || a === "edit-expense") {
      expenseForm(t, id);
      return true;
    }
    if (a === "export-places") {
      downloadRows(
        (t.places || []).map((p) => [
          p.name,
          p.category,
          p.mapLink,
          p.hours,
          p.cost,
          p.website,
          p.note,
        ]),
        `${t.name}-places`,
        ["Name", "Category", "Map", "Hours", "Cost", "Website", "Notes"],
      );
      return true;
    }
    if (a === "export-itinerary") {
      downloadRows(
        [...t.itinerary]
          .sort((a, b) =>
            `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
          )
          .map((i) => [
            i.date,
            i.time,
            TripCalendar.minutes(i.time) !== null
              ? TripCalendar.clock(
                  Math.min(
                    1440,
                    TripCalendar.minutes(i.time) +
                      TripCalendar.duration(i.duration),
                  ),
                )
              : "",
            i.title,
            i.location || "",
            i.note,
            i.cost || "",
            i.hours || "",
          ]),
        `${t.name}-itinerary`,
      );
      return true;
    }
    if (a === "export-budget") {
      downloadRows(
        t.expenses.map((e) => [
          e.date || "",
          e.category || "Miscellaneous",
          e.label,
          planned(e),
          actual(e),
          t.currency,
        ]),
        `${t.name}-budget`,
      );
      return true;
    }
    return false;
  }
  async function submit(form, fd) {
    const tid = form.dataset.trip,
      id = form.dataset.id;
    if (form.id === "place-form") {
      const vals = Object.fromEntries(
        [
          "name",
          "category",
          "district",
          "location",
          "cost",
          "hours",
          "website",
          "mapLink",
          "access",
          "note",
        ].map((k) => [k, String(fd.get(k) || "").trim()]),
      );
      if (!vals.name) return true;
      const ok = await mutate((s) => {
        const t = s.trips.find((t) => t.id === tid);
        t.places ||= [];
        if (id)
          Object.assign(
            t.places.find((p) => p.id === id),
            vals,
          );
        else t.places.push({ id: uid(), ...vals });
      }, "Place saved.");
      if (ok) {
        closeModal();
        render(tid);
      }
      return true;
    }
    if (form.id === "tracked-expense-form") {
      const vals = {
        label: String(fd.get("label") || "").trim(),
        category: fd.get("category"),
        date: fd.get("date"),
        planned: Number(fd.get("planned")) || 0,
        actual: Number(fd.get("actual")) || 0,
      };
      if (!vals.label) return true;
      const ok = await mutate((s) => {
        const t = s.trips.find((t) => t.id === tid);
        if (id) {
          const e = t.expenses.find((e) => e.id === id);
          delete e.amount;
          Object.assign(e, vals);
        } else t.expenses.push({ id: uid(), ...vals });
      }, "Expense saved.");
      if (ok) closeModal();
      return true;
    }
    if (form.id === "paste-places-form") {
      const rows = parseTSV(String(fd.get("rows") || ""));
      if (rows.length > 500) {
        toast("Paste up to 500 places at a time.");
        return true;
      }
      const first = rows[0] || [];
      if (/^(name|attraction|place)(\s|$)/i.test(first[0]?.trim() || ""))
        rows.shift();
      const places = rows
        .filter((r) => r[0]?.trim())
        .map((r) => ({
          id: uid(),
          name: r[0].trim().slice(0, 160),
          category: r[1]?.trim() || "Activities",
          location: "",
          hours: r[3]?.trim() || "",
          cost: r[4]?.trim() || "",
          website: r[5]?.trim() || "",
          note: r[6]?.trim() || "",
          mapLink: r[2]?.trim() || "",
          district: "",
          access: "",
        }));
      if (!places.length) {
        toast(
          "No places found. Paste rows with a place name in the first column.",
        );
        return true;
      }
      if (
        await mutate((s) => {
          const t = s.trips.find((t) => t.id === tid);
          t.places ||= [];
          t.places.push(...places);
        }, `${places.length} places imported.`)
      ) {
        closeModal();
        render(tid);
      }
      return true;
    }
    return false;
  }
  return { render, budget, itinerary, action, submit, planned, actual };
})();

function renderPlanner(id) {
  Planner.render(id);
}
function renderBudget(t) {
  return Planner.budget(t);
}
function renderItinerary(t) {
  Planner.itinerary(t);
}
