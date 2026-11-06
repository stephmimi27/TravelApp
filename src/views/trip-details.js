"use strict";

/* Past-trip details and memories. */

function renderTrip(id) {
  const t = tripById(id);
  if (!t) {
    main.innerHTML = empty(
      "Trip not found",
      "Return to My trips to select a trip.",
    );
    return;
  }
  main.innerHTML = `<a href="#world" class="text-link back-link">${ico("back", 14)} Back to My trips</a><div class="trip-hero"><div class="trip-hero-art">${Art.scene(t.scene)}${t.demo ? '<span class="scene-badge">SAMPLE TRIP</span>' : ""}</div><div class="trip-hero-details"><div class="eyebrow">${ico("pin", 14)}${esc(t.country || "Destination")}</div><h1>${esc(t.name)}</h1><div class="trip-date">${ico("calendar", 13)} ${dateRange(t)}</div><p>${t.memories.length} memories · ${t.memories.filter((m) => m.favorite).length} favorites${t.lat === null ? " · Map pin not set" : ""}</p><div class="hero-actions">${button("Add a memory", "add-memory", "plus", `data-trip="${esc(t.id)}"`, "btn-primary")}${button("Edit trip", "edit-trip", "edit", `data-trip="${esc(t.id)}"`)}<a class="btn" href="#planner/${esc(t.id)}">${ico("calendar", 14)} Travel plans</a></div></div></div><div class="trip-reflection"><h2>${ico("book", 18)} Trip notes</h2><p>${esc(t.reflection || "Use Edit trip to add notes about what you did, recommendations, or things to remember.")}</p></div><div class="section-title"><div><h2>Memories</h2><p>Photos and notes saved for this trip.</p></div><button class="text-link" data-action="import-stories" data-trip="${esc(t.id)}">${ico("instagram", 14)} Import Stories</button></div>${t.memories.length ? `<div class="memory-grid">${t.memories.map((m) => memoryCard({ ...m, trip: t })).join("")}</div>` : empty("No memories yet", "Add a photo, video, or note to this trip.", "add-memory", "Add a memory")}`;
}
