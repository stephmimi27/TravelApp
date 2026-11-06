"use strict";

/* My trips dashboard and map. */

function renderWorld() {
  const visited = state.trips.filter((t) => t.status === "visited");
  const upcoming = state.trips
    .filter((t) => t.status === "upcoming")
    .sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999"));
  const next = upcoming[0];
  const countMemories = allMemories().length;
  const countries = new Set(
    visited.map((t) => t.country.trim().toLowerCase()).filter(Boolean),
  ).size;
  main.innerHTML =
    pageHero(
      "TRAVEL JOURNAL",
      "Your trips, <span>past and upcoming.</span>",
      "Plan upcoming trips and keep photos and notes from past ones.",
      button("Add a past trip", "add-trip", "plus", 'data-status="visited"') +
        button(
          "Plan a trip",
          "add-trip",
          "plane",
          'data-status="upcoming"',
          "btn-primary",
        ),
    ) +
    `<div class="stats-bar">${[
      ["globe", countries, "countries visited"],
      ["pin", visited.length, "past trips"],
      ["camera", countMemories, "memories"],
      ["compass", upcoming.length, "upcoming trips"],
    ]
      .map(
        ([i, n, label]) =>
          `<div class="stat"><span class="stat-icon">${ico(i)}</span><div><div class="stat-value">${String(n).padStart(2, "0")}</div><div class="stat-label">${label}</div></div></div>`,
      )
      .join("")}</div>
  <div class="dashboard-grid"><section class="panel map-panel" aria-label="Travel map"><div class="panel-heading"><div><h2>${ico("globe", 18)} Travel map</h2><p>Select a destination to open its trip details.</p></div><div class="segmented" aria-label="Map filter">${[
    ["all", "All places"],
    ["visited", "Visited"],
    ["dreaming", "Planned"],
  ]
    .map(
      ([v, l]) =>
        `<button data-action="map-filter" data-filter="${v}" class="${mapFilter === v ? "active" : ""}" aria-pressed="${mapFilter === v}">${l}</button>`,
    )
    .join(
      "",
    )}</div></div><div class="map-viewport"><div class="map-world" style="transform:scale(${mapZoom})">${Art.world()}${state.trips
    .filter(
      (t) =>
        t.lat !== null &&
        t.lon !== null &&
        (mapFilter === "all" ||
          (mapFilter === "visited"
            ? t.status === "visited"
            : t.status !== "visited")),
    )
    .map(
      (t) =>
        `<button class="map-pin" style="left:${(Number(t.lon) + 180) / 3.6}%;top:${(90 - Number(t.lat)) / 1.8}%" data-action="open-trip" data-trip="${esc(t.id)}" aria-label="${esc(t.name)}, ${t.status}">${Art.pin(t.status !== "visited")}<span class="pin-label">${esc(t.name)} · ${t.status === "visited" ? "Past trip" : "Planned trip"}</span></button>`,
    )
    .join(
      "",
    )}</div><div class="map-grid"></div><div class="map-caption">PLACES VISITED & PLANNED</div><div class="map-coordinates">TRAVEL MAP · ${state.trips.length} PLACES</div><div class="map-zoom"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="zoom-in" aria-label="Zoom in">+</button></div></div><div class="map-bottom"><div class="map-legend"><span><i class="legend-dot"></i> Visited</span><span><i class="legend-dot dream"></i> Planned / wishlist</span></div><span class="map-hint">Select a destination ${ico("arrow", 12)}</span></div></section>
  <aside class="panel next-panel"><div class="panel-heading"><div class="eyebrow">${ico("plane", 15)} NEXT TRIP</div>${next?.demo ? '<span class="tag">SAMPLE TRIP</span>' : ""}</div>${next ? `<div class="next-scene">${Art.scene(next.scene)}<span class="scene-badge">${esc(daysAway(next))}</span></div><div class="next-content"><h3>${esc(next.name)}, ${esc(next.country)}</h3><div class="trip-date">${ico("calendar", 11)}${dateRange(next)}</div><div class="next-details"><span>Checklist</span><span>${ready(next)} tasks</span></div><div class="progress"><span style="width:${next.checklist.length ? (next.checklist.filter((c) => c.done).length / next.checklist.length) * 100 : 0}%"></span></div>${button("Open planner", "open-trip", "arrow", `data-trip="${esc(next.id)}"`, "btn-green btn-full")}</div>` : `<div class="next-scene">${Art.scene("coast")}</div><div class="next-content"><h3>No upcoming trips</h3><p class="trip-date">Add a destination and start planning.</p>${button("Add a trip", "add-trip", "plus", 'data-status="upcoming"', "btn-green")}</div>`}</aside></div>
  <div class="section-title"><div><h2>Past trips</h2><p>Photos, notes, and memories from your past trips.</p></div><a class="text-link" href="#journal">Open travel journal ${ico("arrow", 14)}</a></div>
  ${
    visited.length
      ? `<div class="trip-cards">${visited
          .sort((a, b) => (b.start || "").localeCompare(a.start || ""))
          .slice(0, 3)
          .map(tripCard)
          .join("")}</div>`
      : empty(
          "No past trips yet",
          "Add a destination, dates, and notes to get started.",
          "add-trip",
          "Add your first trip",
        )
  }${demoNotice()}`;
}
