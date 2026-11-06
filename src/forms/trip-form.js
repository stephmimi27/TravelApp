"use strict";

/* Add and edit trip details. */

function openTripForm(id = "", status = "visited") {
  const old = tripById(id),
    t = old || baseTrip({ status });
  const scenes = Object.keys(sceneNames);
  showModal(
    old
      ? "Edit trip"
      : status === "visited"
        ? "Add a past trip"
        : status === "wishlist"
          ? "Add to wishlist"
          : "Plan a trip",
    `<div class="form-grid">${field("Destination", "name", t.name, "text", 'required maxlength="80" list="place-suggestions" autocomplete="off"', true)}<datalist id="place-suggestions">${Object.keys(
      places,
    )
      .filter((n) => n !== "montreal")
      .map(
        (n) =>
          `<option value="${esc(n.charAt(0).toUpperCase() + n.slice(1))}"></option>`,
      )
      .join(
        "",
      )}</datalist>${field("Country / region", "country", t.country, "text", 'required maxlength="80"')}<div class="form-field"><label for="field-status">Trip status</label><select id="field-status" name="status">${[
      ["visited", "Past trip"],
      ["upcoming", "Upcoming trip"],
      ["wishlist", "Wishlist"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${t.status === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></div>${field("Start date", "start", t.start, "date")}${field("End date", "end", t.end, "date")}<div class="form-field full"><label>Cover illustration</label><div class="scene-options">${scenes.map((s) => `<label class="scene-option"><input type="radio" name="scene" value="${s}" ${t.scene === s ? "checked" : ""}><span>${Art.scene(s)}</span><small>${sceneNames[s]}</small></label>`).join("")}</div></div><div class="form-field full"><label for="field-reflection">Trip notes</label><textarea id="field-reflection" name="reflection" maxlength="8000" placeholder="Activities, highlights, recommendations, or other notes">${esc(t.reflection)}</textarea></div>${field("Trip budget (optional)", "budget", t.budget || "", "number", 'min="0" max="100000000" step="0.01"')}<div class="form-field"><label for="field-currency">Currency</label><select name="currency" id="field-currency">${["CAD", "USD", "EUR", "GBP", "JPY", "HKD", "KRW", "TWD", "AUD", "SGD", "THB", "MXN"].map((c) => `<option ${t.currency === c ? "selected" : ""}>${c}</option>`).join("")}</select></div><details class="form-field full"><summary class="field-hint">Place a pin on the map (optional)</summary><p class="field-hint" style="margin:7px 0">Suggested destinations fill these in. For other places, enter latitude and longitude.</p><div class="form-grid">${field("Latitude", "lat", t.lat ?? "", "number", 'min="-90" max="90" step="any"')}${field("Longitude", "lon", t.lon ?? "", "number", 'min="-180" max="180" step="any"')}</div></details></div>`,
    `${old ? button("Delete trip", "confirm-delete-trip", "trash", `data-trip="${esc(t.id)}" type="button"`, "btn-small danger") : ""}<button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">${ico("check", 15)} Save trip</button>`,
    "trip-form",
  );
  $("#trip-form").dataset.trip = id;
  $("#field-name").addEventListener("input", () => {
    if (old) return;
    const p = places[$("#field-name").value.trim().toLowerCase()];
    if (p) {
      $("#field-country").value = p.country;
      $("#field-lat").value = p.lat;
      $("#field-lon").value = p.lon;
      $(`input[name="scene"][value="${p.scene}"]`).checked = true;
    }
  });
}
