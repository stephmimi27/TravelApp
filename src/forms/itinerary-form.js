"use strict";

/* Schedule saved places and edit itinerary items. */

function openStopForm(tripId, id = "", placeId = "", preset = {}) {
  const t = tripById(tripId);
  if (!t) return;
  const saved = t.places || [],
    old = t.itinerary.find((i) => i.id === id),
    p = saved.find((p) => p.id === (old?.placeId || placeId));
  const item = old || {
    date: preset.date || selectedDay[t.id] || t.start || today(),
    time: preset.time || "09:00",
    duration: preset.duration || 60,
    title: p?.name || "",
    note: p?.note || "",
    location: p?.location || "",
    cost: p?.cost || "",
    hours: p?.hours || "",
    placeId: p?.id || "",
    category: p?.category || "",
    website: p?.website || "",
    mapLink: p?.mapLink || "",
    access: p?.access || "",
  };
  const groups = [...new Set(saved.map((p) => p.category || "Activities"))];
  showModal(
    old ? "Edit itinerary item" : "Add to itinerary",
    `<div class="form-grid"><div class="form-field full"><label for="stop-place">Saved place</label><select id="stop-place" name="savedPlace"><option value="">Custom item</option>${groups
      .map(
        (c) =>
          `<optgroup label="${esc(c)}">${saved
            .filter((p) => (p.category || "Activities") === c)
            .map(
              (p) =>
                `<option value="${esc(p.id)}" ${p.id === item.placeId ? "selected" : ""}>${esc(p.name)}${p.district ? " · " + esc(p.district) : ""}</option>`,
            )
            .join("")}</optgroup>`,
      )
      .join(
        "",
      )}</select><span class="field-hint">Choose from Places to explore, or enter a custom item.</span></div>${field("Title", "title", item.title, "text", 'required maxlength="160"', true)}${field("Date", "date", item.date, "date", "required")}${field("Start time", "time", item.time || "", "time", 'step="900"')}${field("Duration (minutes)", "duration", TripCalendar.duration(item.duration), "number", 'required min="15" max="1440" step="15"')}<div class="form-field"><label>End time</label><output id="stop-end-time" class="end-time-output"></output><span class="field-hint">Or drag the item’s bottom edge on the calendar.</span></div>${field("Location / address", "location", item.location || "", "text", 'maxlength="500"', true)}${field("Cost / price range", "cost", item.cost || "", "text", 'maxlength="250"')}${field("Opening hours", "hours", item.hours || "", "text", 'maxlength="500"')}<div class="form-field full"><label for="stop-note">Notes</label><textarea name="note" id="stop-note" maxlength="2000" placeholder="Reservations, directions, or other details">${esc(item.note)}</textarea></div></div>`,
    `${old ? button("Remove item", "confirm-remove-calendar-item", "trash", `data-trip="${esc(t.id)}" data-id="${esc(item.id)}" type="button"`, "btn-small danger") : ""}<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">${ico("check", 15)} Save item</button>`,
    "stop-form",
  );
  const form = $("#stop-form");
  form.dataset.trip = tripId;
  form.dataset.id = id;
  function sourceMeta(source) {
    form.dataset.place = source?.id || "";
    for (const key of ["category", "website", "mapLink", "access"])
      form.dataset[key] = source?.[key] || "";
  }
  sourceMeta({ ...item, id: item.placeId });
  function endTime() {
    const start = TripCalendar.minutes($("#field-time").value),
      length = Number($("#field-duration").value) || 60;
    $("#stop-end-time").textContent =
      start === null
        ? "Unscheduled"
        : start + length <= 1440
          ? TripCalendar.clock(start + length)
          : "Extends past midnight";
  }
  $("#stop-place").addEventListener("change", (e) => {
    const source = saved.find((p) => p.id === e.target.value);
    sourceMeta(source);
    $("#field-title").value = source?.name || "";
    for (const key of ["location", "cost", "hours"])
      $("#field-" + key).value = source?.[key] || "";
    $("#stop-note").value = source?.note || "";
  });
  $("#field-time").addEventListener("input", endTime);
  $("#field-duration").addEventListener("input", endTime);
  endTime();
}

function openExpenseForm(tripId) {
  const t = tripById(tripId);
  if (!t) return;
  showModal(
    "Add expense",
    `<div class="form-grid">${field("What was it for?", "label", "", "text", 'required maxlength="100"', true)}${field(`Amount (${t.currency})`, "amount", "", "number", 'required min="0.01" max="100000000" step="0.01"', true)}<p class="field-hint" style="grid-column:1/-1">All expenses for this trip use ${esc(t.currency)}. Changing the currency label doesn’t convert amounts.</p></div>`,
    `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">Save expense</button>`,
    "expense-form",
  );
  $("#expense-form").dataset.trip = tripId;
}
