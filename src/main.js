"use strict";

/* Routing and application startup only. Keep feature code in its own file. */

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}
function render() {
  if (!state) return;
  TripCalendar.capture();
  TripCalendar.cancelDrag();
  const [route = "world", id = ""] = location.hash.slice(1).split("/");
  const page = ["world", "journal", "planner", "passport", "trip"].includes(
    route,
  )
    ? route
    : "world";
  $("#navigation").innerHTML = [
    ["world", "globe", "My trips"],
    ["journal", "book", "Travel journal"],
    ["planner", "compass", "Trip planner"],
    ["passport", "flag", "My passport"],
  ]
    .map(
      ([p, icon, text]) =>
        `<a class="nav-link ${page === p || (page === "trip" && p === "journal") ? "active" : ""}" href="#${p}" ${page === p ? 'aria-current="page"' : ""}>${ico(icon)}${text}</a>`,
    )
    .join("");
  main.className = "page-enter" + (page === "planner" ? " planner-page" : "");
  if (page === "world") renderWorld();
  if (page === "journal") renderJournal();
  if (page === "planner") renderPlanner(id);
  if (page === "passport") renderPassport();
  if (page === "trip") renderTrip(id);
  document.title = `${{ world: "My trips", journal: "Travel journal", planner: "Trip planner", passport: "My passport", trip: tripById(id)?.name || "Travel journal" }[page]} · Air Time`;
}

/* Start the app after every feature has loaded. */
$("#brand-icon").innerHTML = Art.backpack();
$("#open-settings").innerHTML = ico("settings", 17);
$("#open-settings").addEventListener("click", settings);
$("#open-passport").innerHTML = Art.avatar();
$("#open-passport").addEventListener("click", () => navigate("#passport"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
modal.addEventListener("close", () => {
  pendingMemoryMedia = null;
  pendingStoryMedia = [];
  storySession++;
});
window.addEventListener("hashchange", () => {
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
});
(async () => {
  try {
    db = await openDB();
    state = await readDB();
    if (!state) {
      state = demoData();
      await writeDB(state);
    }
  } catch (err) {
    persistent = false;
    state = demoData();
    console.error(err);
    $(".save-indicator").innerHTML =
      '<i style="background:#c79772"></i> Temporary session';
    toast(
      "Browser storage is unavailable. Export a backup before leaving this session.",
    );
  }
  render();
})();
