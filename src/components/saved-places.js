/* One saved-place library for research and the calendar's bottom tray. */
const PlaceLibrary = (() => {
  const categories = [
    "Food",
    "Museums",
    "Shopping",
    "Landmarks",
    "Activities",
    "Parks & hikes",
    "Transit",
    "Accommodation",
    "Miscellaneous",
  ];
  const filters = new Map();
  const categoryOf = (p) => p.category || "Activities";
  const tone = (c) => {
    const n = categories.indexOf(c);
    return n >= 0
      ? n % 6
      : [...String(c || "")].reduce(
          (sum, char) => sum + char.charCodeAt(0),
          0,
        ) % 6;
  };
  const url = (value) => (/^https?:\/\//i.test(value || "") ? esc(value) : "");
  const mapLink = (p) =>
    url(p.mapLink) ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location || p.name || "")}`;
  function selection(t) {
    if (!filters.has(t.id))
      filters.set(t.id, { category: "All", query: "", district: "" });
    const f = filters.get(t.id),
      places = t.places || [];
    if (
      f.category !== "All" &&
      !places.some((p) => categoryOf(p) === f.category)
    )
      f.category = "All";
    if (f.district && !places.some((p) => p.district === f.district))
      f.district = "";
    return f;
  }
  function filtered(t) {
    const f = selection(t),
      query = f.query.trim().toLowerCase();
    return (t.places || []).filter(
      (p) =>
        (f.category === "All" || categoryOf(p) === f.category) &&
        (!f.district || p.district === f.district) &&
        (!query ||
          [
            "name",
            "category",
            "district",
            "location",
            "cost",
            "hours",
            "note",
            "access",
          ]
            .map((key) => p[key] || "")
            .join(" ")
            .toLowerCase()
            .includes(query)),
    );
  }
  function tabs(t) {
    const f = selection(t),
      places = t.places || [],
      used = [...new Set(places.map(categoryOf))];
    const cats = [
      "All",
      ...categories.filter((c) => used.includes(c)),
      ...used.filter((c) => !categories.includes(c)),
    ];
    return `<div class="place-category-tabs" role="tablist" aria-label="Saved place categories">${cats.map((c, index) => `<button type="button" id="place-category-${index}" role="tab" aria-selected="${f.category === c}" tabindex="${f.category === c ? 0 : -1}" aria-controls="place-library-results" data-place-category="${esc(c)}" class="${f.category === c ? "active" : ""}">${esc(c)}<small>${c === "All" ? places.length : places.filter((p) => categoryOf(p) === c).length}</small></button>`).join("")}</div>`;
  }
  function card(t, p, calendar) {
    const count = t.itinerary.filter((i) => i.placeId === p.id).length;
    const attributes = `data-trip="${esc(t.id)}" data-id="${esc(p.id)}"`;
    const add = calendar
      ? 'data-calendar-action="choose-place"'
      : 'data-action="schedule-place"';
    return `<article class="place-card tone-${tone(categoryOf(p))} ${calendar ? "calendar-place" : ""}" ${attributes} ${calendar ? 'data-calendar-source="place"' : ""} aria-label="${esc(p.name)}">
      <div class="place-card-heading">${calendar ? `<button type="button" class="drag-grip" data-calendar-action="choose-place" aria-label="Schedule ${esc(p.name)}. Drag onto the calendar or press Enter to choose a time."><span aria-hidden="true">⠿</span></button>` : ""}<div><h3>${esc(p.name)}</h3><div class="place-card-tags"><span>${esc(categoryOf(p))}</span>${p.district ? `<span>${esc(p.district)}</span>` : ""}</div></div></div>
      <a class="place-card-location" href="${mapLink(p)}" target="_blank" rel="noopener noreferrer">${ico("pin", 12)}<span>${esc(p.location || "View on map")}</span>${ico("arrow", 10)}</a>
      <dl class="place-card-facts"><div><dt>Cost</dt><dd>${esc(p.cost || "—")}</dd></div><div><dt>Hours</dt><dd>${esc(p.hours || "—")}</dd></div></dl>
      ${p.note ? `<p class="place-card-note" title="${esc(p.note)}">${esc(p.note)}</p>` : ""}${p.access ? `<p class="place-card-access"><span>Getting there</span> ${esc(p.access)}</p>` : ""}
      <div class="place-card-links">${url(p.website) ? `<a href="${url(p.website)}" target="_blank" rel="noopener noreferrer">Website ${ico("arrow", 10)}</a>` : ""}<span class="${count ? "is-scheduled" : ""}">${count ? `Scheduled ${count}×` : "Not scheduled"}</span></div>
      <div class="place-card-actions"><button type="button" class="btn btn-small" ${add} ${attributes}>${ico("plus", 12)} Add to itinerary</button><button type="button" class="text-link" data-action="edit-place" ${attributes} aria-label="Edit ${esc(p.name)}">Edit</button><button type="button" class="place-card-remove" data-action="remove-place" ${attributes} aria-label="Remove ${esc(p.name)}">${ico("close", 12)}</button></div>
    </article>`;
  }
  function cards(t, calendar = false) {
    const places = filtered(t);
    return places.length
      ? places.map((p) => card(t, p, calendar)).join("")
      : `<div class="place-library-empty">${ico("pin", 25)}<p>${(t.places || []).length ? "No places match these filters." : "No saved places yet."}</p><button class="text-link" type="button" ${(t.places || []).length ? "data-place-clear" : 'data-action="add-place"'} data-trip="${esc(t.id)}">${(t.places || []).length ? "Clear filters" : "Save a place"}</button></div>`;
  }
  function render(t, context = "research") {
    const calendar = context === "calendar",
      f = selection(t),
      districts = [
        ...new Set((t.places || []).map((p) => p.district).filter(Boolean)),
      ];
    return `<section class="panel plan-section place-library ${calendar ? "calendar-library" : ""}" data-place-library="${context}" data-trip="${esc(t.id)}" aria-label="${calendar ? "Saved places tray" : "Places to explore"}">
      <div class="place-library-heading"><div><h2>${calendar ? "Saved places" : "Places to explore"}</h2><p>${calendar ? "Drag a card up to a day and time." : "Save places here, then add them to your itinerary."}</p></div><button type="button" class="btn btn-primary btn-small" data-action="add-place" data-trip="${esc(t.id)}">${ico("plus", 13)} Save a place</button></div>
      <div class="place-library-toolbar"><div class="search-field">${ico("search", 14)}<input id="place-library-search" data-place-search value="${esc(f.query)}" placeholder="Search saved places" aria-label="Search saved places"></div><select data-place-district aria-label="Filter places by district"><option value="">All districts / areas</option>${districts.map((d) => `<option ${f.district === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select><div class="place-library-import"><button class="text-link" type="button" data-action="paste-places" data-trip="${esc(t.id)}">${ico("book", 12)} Paste from Sheets</button><button class="text-link" type="button" data-action="export-places" data-trip="${esc(t.id)}">${ico("download", 12)} Export</button></div></div>
      ${tabs(t)}<p class="sr-only" data-place-result-count role="status">${filtered(t).length} ${filtered(t).length === 1 ? "place" : "places"} shown</p><div id="place-library-results" class="place-library-grid" role="tabpanel" tabindex="0" aria-label="Places in selected category">${cards(t, calendar)}</div>
      ${calendar ? `<div class="place-library-footer"><span>On touch screens, drag the grip. You can also use “Add to itinerary”.</span><button type="button" class="text-link" data-action="planner-tab" data-tab="places" data-trip="${esc(t.id)}">Places to explore ${ico("arrow", 12)}</button></div>` : ""}
    </section>`;
  }
  function refresh(root, t) {
    const f = selection(t),
      active = [...root.querySelectorAll("[data-place-category]")].find(
        (b) => b.dataset.placeCategory === f.category,
      );
    root.querySelectorAll("[data-place-category]").forEach((b) => {
      const selected = b === active;
      b.classList.toggle("active", selected);
      b.setAttribute("aria-selected", String(selected));
      b.tabIndex = selected ? 0 : -1;
    });
    const results = root.querySelector("#place-library-results");
    results.innerHTML = cards(t, root.dataset.placeLibrary === "calendar");
    if (active) results.setAttribute("aria-labelledby", active.id);
    root.querySelector("[data-place-result-count]").textContent =
      `${filtered(t).length} ${filtered(t).length === 1 ? "place" : "places"} shown`;
  }
  document.addEventListener("input", (e) => {
    if (!e.target.matches("[data-place-search]")) return;
    const root = e.target.closest("[data-place-library]"),
      t = tripById(root.dataset.trip);
    if (!t) return;
    selection(t).query = e.target.value;
    refresh(root, t);
  });
  document.addEventListener("change", (e) => {
    if (!e.target.matches("[data-place-district]")) return;
    const root = e.target.closest("[data-place-library]"),
      t = tripById(root.dataset.trip);
    if (!t) return;
    selection(t).district = e.target.value;
    refresh(root, t);
  });
  document.addEventListener("click", (e) => {
    const control = e.target.closest(
      "[data-place-category],[data-place-clear]",
    );
    if (!control) return;
    const root = control.closest("[data-place-library]"),
      t = tripById(root.dataset.trip);
    if (!t) return;
    if (control.hasAttribute("data-place-clear")) {
      Object.assign(selection(t), { query: "", category: "All", district: "" });
      root.querySelector("[data-place-search]").value = "";
      root.querySelector("[data-place-district]").value = "";
    } else selection(t).category = control.dataset.placeCategory;
    refresh(root, t);
  });
  document.addEventListener("keydown", (e) => {
    const current = e.target.closest("[data-place-category]");
    if (!current || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
      return;
    e.preventDefault();
    const tabs = [
        ...current.parentElement.querySelectorAll("[data-place-category]"),
      ],
      index = tabs.indexOf(current);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    tabs[next].focus();
    tabs[next].click();
  });
  return { render, filtered, cards, tone, categories };
})();
