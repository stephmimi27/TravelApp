"use strict";

/* Travel journal and memory search. */

function renderJournal() {
  main.innerHTML =
    pageHero(
      "PHOTOS & NOTES",
      "Travel journal",
      "Save photos, videos, and notes from your trips.",
      button("Import Stories", "import-stories", "instagram") +
        button("Add a memory", "add-memory", "plus", "", "btn-primary"),
    ) +
    `<div class="toolbar"><div class="search-field">${ico("search", 16)}<input id="journal-search" aria-label="Search memories" placeholder="Search memories or destinations" value="${esc(journalSearch)}"></div><select id="journal-trip" aria-label="Filter by trip"><option value="">All trips</option>${state.trips.map((t) => `<option value="${esc(t.id)}" ${journalTrip === t.id ? "selected" : ""}>${esc(t.name)}${t.demo ? " (sample)" : ""}</option>`).join("")}</select><button class="btn btn-small ${favoritesOnly ? "btn-green" : ""}" data-action="favorites-only" aria-pressed="${favoritesOnly}">${ico("heart", 14, favoritesOnly)} Favorites</button></div><div id="journal-results"></div>${demoNotice()}`;
  updateJournalResults();
}
function updateJournalResults() {
  const q = journalSearch.toLocaleLowerCase();
  const memories = allMemories()
    .filter(
      (m) =>
        (!journalTrip || m.trip.id === journalTrip) &&
        (!favoritesOnly || m.favorite) &&
        (!q ||
          `${m.title} ${m.text} ${m.feeling} ${m.trip.name} ${m.trip.country}`
            .toLocaleLowerCase()
            .includes(q)),
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  $("#journal-results").innerHTML = memories.length
    ? `<div class="memory-grid">${memories.map(memoryCard).join("")}</div>`
    : empty(
        "No memories found",
        q || journalTrip || favoritesOnly
          ? "No memories match these filters. Try another place or clear your search."
          : "Add a photo, note, or saved Instagram Story.",
        "add-memory",
        "Add a memory",
      );
}
