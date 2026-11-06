/* Local-time trip calendar. Pointer interactions support mouse and touch. */
const TripCalendar = (() => {
  const HOUR = 56,
    STEP = 15,
    DAY = 1440,
    PAGE = 5;
  const prefs = new Map(),
    noteDrafts = new Map();
  let drag = null,
    ghost = null,
    preview = null,
    frame = 0,
    suppressClickUntil = 0,
    lastChange = null;
  const preference = (id) => {
    if (!prefs.has(id))
      prefs.set(id, { view: "week", index: 0, top: 7.5 * HOUR, left: 0 });
    return prefs.get(id);
  };
  function minutes(time) {
    if (typeof time === "number") return Number.isFinite(time) ? time : null;
    const m = /^(\d{2}):(\d{2})$/.exec(time || "");
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }
  const clock = (n) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const snap = (n) => Math.round(n / STEP) * STEP;
  const duration = (v) => Math.max(STEP, Math.min(DAY, snap(Number(v) || 60)));
  const startFor = (start, len) =>
    Math.max(0, Math.min(DAY - len, snap(Number(start) || 0)));
  const validDate = (d) =>
    !!parseDate(d) && !isNaN(parseDate(d)) && localDate(parseDate(d)) === d;
  const tone = (c) => PlaceLibrary.tone(c);
  function range(t) {
    const p = preference(t.id),
      dates = tripDates(t),
      count = p.view === "day" ? 1 : PAGE;
    p.index = Math.max(0, Math.min(p.index, Math.max(0, dates.length - 1)));
    return { dates, visible: dates.slice(p.index, p.index + count), count, p };
  }
  function capture() {
    const root = $("#trip-calendar");
    if (!root?.dataset?.trip) return;
    const p = preference(root.dataset.trip),
      scroller = $(".calendar-scroll", root);
    if (scroller) {
      p.top = scroller.scrollTop;
      p.left = scroller.scrollLeft;
    }
    const note = $("#plan-notes"),
      t = tripById(root.dataset.trip);
    if (note && t) {
      if (note.value !== t.notes) noteDrafts.set(t.id, note.value);
      else noteDrafts.delete(t.id);
    }
  }
  function noteValue(t) {
    return noteDrafts.has(t.id) ? noteDrafts.get(t.id) : t.notes;
  }
  function layoutEvents(items) {
    const sorted = items
      .map((item) => ({
        item,
        start: minutes(item.time),
        duration: duration(item.duration),
      }))
      .filter((i) => i.start !== null)
      .sort((a, b) => a.start - b.start || b.duration - a.duration);
    const result = [];
    let group = [],
      maxEnd = -1;
    function flush() {
      if (!group.length) return;
      const lanes = [];
      for (const entry of group) {
        let lane = lanes.findIndex((end) => end <= entry.start);
        if (lane === -1) lane = lanes.length;
        lanes[lane] = entry.start + entry.duration;
        entry.lane = lane;
      }
      for (const entry of group) {
        entry.lanes = lanes.length;
        result.push(entry);
      }
      group = [];
      maxEnd = -1;
    }
    for (const entry of sorted) {
      entry.duration = Math.min(entry.duration, DAY - entry.start);
      if (group.length && entry.start >= maxEnd) flush();
      group.push(entry);
      maxEnd = Math.max(maxEnd, entry.start + entry.duration);
    }
    flush();
    return result;
  }
  function eventCard(t, entry) {
    const { item: i, start, duration: len, lane, lanes } = entry,
      cat =
        i.category ||
        (t.places || []).find((p) => p.id === i.placeId)?.category ||
        "Activities";
    return `<div class="calendar-event tone-${tone(cat)} ${i.done ? "is-done" : ""} ${len <= 30 ? "short-event" : ""}" style="top:${(start / 60) * HOUR}px;height:${Math.max(14, (len / 60) * HOUR - 2)}px;left:calc(${(lane / lanes) * 100}% + 3px);width:calc(${100 / lanes}% - 6px)" data-calendar-source="event" data-calendar-action="edit-event" data-trip="${esc(t.id)}" data-id="${esc(i.id)}" tabindex="0" role="button" aria-label="${esc(i.title)}, ${fmtDate(i.date)}, ${clock(start)} to ${clock(start + len)}. Drag to move. Press Enter to edit."><strong>${esc(i.title)}</strong><span class="calendar-event-time">${clock(start)}–${clock(start + len)}</span>${i.location && len >= 60 ? `<small>${esc(i.location)}</small>` : ""}<button type="button" class="calendar-resize" data-calendar-resize="true" data-calendar-action="resize" aria-label="Resize ${esc(i.title)}. Drag or use arrow keys to change duration."></button></div>`;
  }
  function unscheduled(t, i) {
    return `<div class="calendar-unscheduled-item tone-${tone(i.category)}" data-calendar-source="event" data-calendar-action="edit-event" data-trip="${esc(t.id)}" data-id="${esc(i.id)}" tabindex="0" role="button" aria-label="${esc(i.title)}. No time set. Drag onto a time slot to schedule.">${esc(i.title)}</div>`;
  }
  function render(t) {
    const { dates, visible, count, p } = range(t);
    const period = visible.length
      ? fmtDate(visible[0], { month: "short", day: "numeric" }) +
        (visible.length > 1
          ? " – " + fmtDate(visible.at(-1), { month: "short", day: "numeric" })
          : "")
      : "";
    const undated = t.itinerary.filter((i) => !i.date),
      hasUntimed = visible.some((d) =>
        t.itinerary.some((i) => i.date === d && minutes(i.time) === null),
      );
    return `<section id="trip-calendar" data-trip="${esc(t.id)}" class="trip-calendar" aria-label="Trip itinerary calendar"><div class="calendar-workbench"><div class="calendar-toolbar"><div class="calendar-period"><button class="icon-btn" data-calendar-action="previous" data-trip="${esc(t.id)}" aria-label="Previous ${count === 1 ? "day" : "days"}" ${p.index === 0 ? "disabled" : ""}>${ico("back", 15)}</button><div><strong>${period}</strong><span>${visible[0]?.slice(0, 4) || "Set trip dates to get started"}</span></div><button class="icon-btn" data-calendar-action="next" data-trip="${esc(t.id)}" aria-label="Next ${count === 1 ? "day" : "days"}" ${p.index + count >= dates.length ? "disabled" : ""}>${ico("arrow", 15)}</button></div><div class="calendar-tools">${lastChange?.trip === t.id && t.itinerary.some((i) => i.id === lastChange.id) ? `<button class="text-link" data-calendar-action="undo" data-trip="${esc(t.id)}">Undo</button>` : ""}<div class="segmented" aria-label="Calendar view">${[
      ["week", "5 days"],
      ["day", "Day"],
    ]
      .map(
        ([v, l]) =>
          `<button data-calendar-action="view" data-view="${v}" data-trip="${esc(t.id)}" aria-pressed="${p.view === v}" class="${p.view === v ? "active" : ""}">${l}</button>`,
      )
      .join(
        "",
      )}</div><button class="btn btn-small" data-action="add-stop" data-trip="${esc(t.id)}">${ico("plus", 13)} Add item</button></div></div>${
      visible.length
        ? `<div class="calendar-scroll" tabindex="0" aria-label="Scrollable calendar, local time"><div class="calendar-grid" style="--days:${visible.length}"><div class="calendar-day-head calendar-corner">LOCAL<br>TIME</div>${visible.map((d) => `<div class="calendar-day-head ${d === today() ? "is-today" : ""}"><span>${fmtDate(d, { weekday: "short" })}</span><strong>${fmtDate(d, { day: "numeric" })}</strong><small>${fmtDate(d, { month: "short" })}</small></div>`).join("")}${
            hasUntimed
              ? `<div class="calendar-unscheduled-label">No time</div>${visible
                  .map(
                    (d) =>
                      `<div class="calendar-unscheduled-cell">${t.itinerary
                        .filter((i) => i.date === d && minutes(i.time) === null)
                        .map((i) => unscheduled(t, i))
                        .join("")}</div>`,
                  )
                  .join("")}`
              : ""
          }<div class="calendar-hours" style="height:${24 * HOUR}px">${Array.from({ length: 24 }, (_, h) => `<span style="top:${h * HOUR}px">${String(h).padStart(2, "0")}:00</span>`).join("")}</div>${visible
            .map(
              (d) =>
                `<div class="calendar-day ${d === today() ? "is-today" : ""}" style="height:${24 * HOUR}px" data-calendar-day="${d}" data-trip="${esc(t.id)}" tabindex="0" role="button" aria-label="Schedule an item on ${fmtDate(d, { weekday: "long", month: "short", day: "numeric" })}">${layoutEvents(
                  t.itinerary.filter((i) => i.date === d),
                )
                  .map((entry) => eventCard(t, entry))
                  .join("")}</div>`,
            )
            .join(
              "",
            )}</div></div><div class="calendar-footer"><span>15-minute intervals · Drag to move · Drag an item’s bottom edge to resize</span><button class="text-link" data-action="export-itinerary" data-trip="${esc(t.id)}">${ico("download", 12)} Export</button></div>`
        : `<div class="calendar-no-dates">${ico("calendar", 35)}<h3>Add your trip dates</h3><p>Set a start and end date, then drag saved places onto your schedule.</p><button class="btn btn-primary" data-action="edit-trip" data-trip="${esc(t.id)}">Set dates</button></div>`
    }${undated.length ? `<div class="undated-plans"><h4>Items without a date</h4>${undated.map((i) => unscheduled(t, i)).join("")}</div>` : ""}<span class="sr-only" id="calendar-announcement" role="status" aria-live="polite"></span></div>${PlaceLibrary.render(t, "calendar")}</section>`;
  }
  function mount(t) {
    const root = $("#trip-calendar");
    if (!root) return;
    const scroller = $(".calendar-scroll", root),
      p = preference(t.id);
    if (scroller) {
      scroller.scrollTop = p.top;
      scroller.scrollLeft = p.left;
    }
  }
  function refresh(t, savePosition = true) {
    if (savePosition) capture();
    const root = $("#trip-calendar");
    if (!root) return;
    root.outerHTML = render(t);
    mount(t);
  }
  async function schedulePlace(tripId, placeId, date, start, len = 60) {
    const t = tripById(tripId),
      place = (t?.places || []).find((p) => p.id === placeId);
    if (!place || !validDate(date)) return false;
    let at = minutes(start);
    if (at === null) return false;
    len = Math.min(duration(len), DAY - snap(Math.max(0, Math.min(1425, at))));
    at = startFor(at, len);
    const id = uid(),
      previous = lastChange;
    lastChange = { trip: tripId, id, before: null };
    const ok = await mutate(
      (s) =>
        s.trips
          .find((t) => t.id === tripId)
          .itinerary.push({
            id,
            placeId: place.id,
            title: place.name,
            date,
            time: clock(at),
            duration: len,
            note: place.note || "",
            location: place.location || "",
            category: place.category || "Activities",
            cost: place.cost || "",
            hours: place.hours || "",
            website: place.website || "",
            mapLink: place.mapLink || "",
            access: place.access || "",
            done: false,
          }),
      "Added to itinerary.",
    );
    if (!ok) lastChange = previous;
    return ok ? id : false;
  }
  async function reschedule(tripId, id, date, start, len) {
    const item = tripById(tripId)?.itinerary.find((i) => i.id === id);
    let at = minutes(start);
    if (!item || at === null || !validDate(date)) return false;
    len = duration(len ?? item.duration);
    at = startFor(at, len);
    const previous = lastChange;
    lastChange = {
      trip: tripId,
      id,
      before: { date: item.date, time: item.time, duration: item.duration },
    };
    const ok = await mutate(
      (s) =>
        Object.assign(
          s.trips
            .find((t) => t.id === tripId)
            .itinerary.find((i) => i.id === id),
          { date, time: clock(at), duration: len },
        ),
      "Schedule updated.",
    );
    if (!ok) lastChange = previous;
    return ok;
  }
  async function resize(tripId, id, len) {
    const item = tripById(tripId)?.itinerary.find((i) => i.id === id);
    const at = minutes(item?.time);
    if (at === null) return false;
    return reschedule(
      tripId,
      id,
      item.date,
      at,
      Math.min(duration(len), DAY - at),
    );
  }
  async function undo(tripId) {
    const change = lastChange;
    if (!change || change.trip !== tripId) return false;
    lastChange = null;
    const ok = await mutate((s) => {
      const t = s.trips.find((t) => t.id === tripId);
      if (change.before) {
        const item = t?.itinerary.find((i) => i.id === change.id);
        if (item) Object.assign(item, change.before);
      } else if (t) t.itinerary = t.itinerary.filter((i) => i.id !== change.id);
    }, "Change undone.");
    if (!ok) lastChange = change;
    return ok;
  }
  function cleanDrag() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    ghost?.remove();
    preview?.remove();
    ghost = null;
    preview = null;
    document
      .querySelectorAll(".calendar-dragging")
      .forEach((x) => x.classList.remove("calendar-dragging"));
    document.body?.classList.remove("calendar-is-dragging");
    drag = null;
  }
  function targetAt(x, y) {
    return (
      document.elementFromPoint(x, y)?.closest("[data-calendar-day]") || null
    );
  }
  function minuteAt(day, y) {
    return Math.max(
      0,
      Math.min(1425, snap(((y - day.getBoundingClientRect().top) / HOUR) * 60)),
    );
  }
  function previewAt(day, at, len, title) {
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "calendar-drop-preview";
    }
    if (preview.parentElement !== day) day.append(preview);
    preview.style.top = `${(at / 60) * HOUR}px`;
    preview.style.height = `${Math.max(14, (len / 60) * HOUR - 2)}px`;
    preview.replaceChildren();
    const name = document.createElement("strong");
    name.textContent = title;
    const time = document.createElement("span");
    time.textContent = `${clock(at)}–${clock(at + len)}`;
    preview.append(name, time);
  }
  function updatePointer() {
    if (!drag?.active) return;
    const { x, y } = drag;
    let day = targetAt(x, y);
    if (drag.kind === "resize" || drag.kind === "selection") day = drag.day;
    if (!day?.isConnected) {
      preview?.remove();
      drag.target = null;
      return;
    }
    let at, len;
    if (drag.kind === "selection") {
      const current = minuteAt(day, y);
      at = Math.min(drag.anchor, current);
      len = Math.min(DAY - at, Math.abs(current - drag.anchor) + STEP);
    } else if (drag.kind === "resize") {
      at = drag.originalStart;
      len = Math.max(
        STEP,
        Math.min(
          DAY - at,
          snap(((y - day.getBoundingClientRect().top) / HOUR) * 60) - at,
        ),
      );
    } else {
      len = drag.length;
      at = startFor(minuteAt(day, y) - drag.offset, len);
    }
    drag.target = { date: day.dataset.calendarDay, start: at, duration: len };
    previewAt(day, at, len, drag.title || "New item");
    if (ghost) {
      ghost.style.left = `${x + 15}px`;
      ghost.style.top = `${y + 14}px`;
      ghost.classList.toggle("invalid-drop", !targetAt(x, y));
    }
  }
  function autoScroll() {
    if (!drag?.active) return;
    const scroller = $(".calendar-scroll");
    let changed = false;
    if (scroller) {
      const r = scroller.getBoundingClientRect();
      if (
        drag.x >= r.left &&
        drag.x <= r.right &&
        drag.y >= r.top - 35 &&
        drag.y <= r.bottom + 35
      ) {
        const oldTop = scroller.scrollTop,
          oldLeft = scroller.scrollLeft;
        if (drag.y < r.top + 45) scroller.scrollTop -= 12;
        else if (drag.y > r.bottom - 45) scroller.scrollTop += 12;
        if (drag.x < r.left + 55) scroller.scrollLeft -= 10;
        else if (drag.x > r.right - 35) scroller.scrollLeft += 10;
        changed =
          oldTop !== scroller.scrollTop || oldLeft !== scroller.scrollLeft;
      }
    }
    if (!changed) {
      const oldY = window.scrollY;
      if (drag.y < 40) window.scrollBy(0, -14);
      else if (drag.y > window.innerHeight - 40) window.scrollBy(0, 14);
      changed = oldY !== window.scrollY;
    }
    if (changed) updatePointer();
    frame = requestAnimationFrame(autoScroll);
  }

  function beginDrag(e) {
    if (!drag) return;
    drag.active = true;
    drag.source?.classList.add("calendar-dragging");
    document.body.classList.add("calendar-is-dragging");
    try {
      drag.source?.setPointerCapture?.(e.pointerId);
    } catch {}
    if (drag.kind === "place" || drag.kind === "event") {
      ghost = document.createElement("div");
      ghost.className = "calendar-drag-ghost";
      ghost.textContent = drag.title;
      document.body.append(ghost);
    }
    updatePointer();
    frame = requestAnimationFrame(autoScroll);
  }
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !e.target.closest("#trip-calendar")) return;
    const source = e.target.closest("[data-calendar-source]"),
      day = e.target.closest("[data-calendar-day]");
    if (source) {
      const grip = e.target.closest(".drag-grip"),
        resizeHandle = e.target.closest("[data-calendar-resize]");
      if (
        e.target.closest("button,a,input,select,textarea") &&
        !grip &&
        !resizeHandle
      )
        return;
      if (
        e.pointerType === "touch" &&
        !grip &&
        !resizeHandle &&
        source.dataset.calendarSource === "place"
      )
        return;
      const t = tripById(source.dataset.trip),
        isPlace = source.dataset.calendarSource === "place",
        item = isPlace
          ? (t?.places || []).find((i) => i.id === source.dataset.id)
          : t?.itinerary.find((i) => i.id === source.dataset.id);
      if (!item) return;
      drag = {
        source,
        kind: resizeHandle ? "resize" : isPlace ? "place" : "event",
        trip: t.id,
        id: item.id,
        title: isPlace ? item.name : item.title,
        length: duration(item.duration),
        originalStart: minutes(item.time) || 0,
        offset:
          !isPlace && day && !resizeHandle
            ? Math.max(
                0,
                Math.floor(
                  (((e.clientY - source.getBoundingClientRect().top) / HOUR) *
                    60) /
                    STEP,
                ) * STEP,
              )
            : 0,
        day,
        downX: e.clientX,
        downY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        pointer: e.pointerId,
        active: false,
      };
    } else if (day && !e.target.closest("button,a")) {
      drag = {
        source: day,
        day,
        kind: "selection",
        trip: day.dataset.trip,
        anchor: minuteAt(day, e.clientY),
        title: "New item",
        downX: e.clientX,
        downY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        pointer: e.pointerId,
        active: false,
      };
    }
  });
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (
        !drag.active &&
        Math.hypot(e.clientX - drag.downX, e.clientY - drag.downY) >= 6
      )
        beginDrag(e);
      if (drag.active) {
        e.preventDefault();
        updatePointer();
      }
    },
    { passive: false },
  );
  document.addEventListener("pointerup", async (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const d = drag,
      active = d.active,
      target = d.target;
    cleanDrag();
    if (!active) return;
    suppressClickUntil = Date.now() + 500;
    e.preventDefault();
    if (!target) return;
    if (d.kind === "place")
      await schedulePlace(
        d.trip,
        d.id,
        target.date,
        target.start,
        target.duration,
      );
    else if (d.kind === "event")
      await reschedule(
        d.trip,
        d.id,
        target.date,
        target.start,
        target.duration,
      );
    else if (d.kind === "resize") await resize(d.trip, d.id, target.duration);
    else
      openStopForm(d.trip, "", "", {
        date: target.date,
        time: clock(target.start),
        duration: target.duration,
      });
  });
  document.addEventListener("pointercancel", cleanDrag);
  document.addEventListener(
    "click",
    async (e) => {
      const root = e.target.closest("#trip-calendar");
      if (!root) return;
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      const control = e.target.closest("[data-calendar-action]");
      const tripId =
          control?.dataset.trip ||
          control?.closest("[data-trip]")?.dataset.trip ||
          root.dataset.trip,
        t = tripById(tripId);
      if (!t) return;
      const p = preference(tripId),
        a = control?.dataset.calendarAction;
      if (a) {
        e.preventDefault();
        if (a === "resize") return;
        if (a === "choose-place") {
          const source = control.closest("[data-calendar-source]");
          openStopForm(tripId, "", source?.dataset.id, {
            date: range(t).visible[0] || t.start || today(),
            time: "09:00",
          });
          return;
        }
        if (a === "edit-event") {
          openStopForm(tripId, control.dataset.id);
          return;
        }
        if (a === "view") {
          capture();
          p.view = control.dataset.view;
          p.left = 0;
          refresh(t, false);
          return;
        }
        if (a === "next" || a === "previous") {
          capture();
          p.index = Math.max(
            0,
            Math.min(
              Math.max(0, tripDates(t).length - 1),
              p.index + (a === "next" ? 1 : -1) * (p.view === "day" ? 1 : PAGE),
            ),
          );
          p.left = 0;
          refresh(t, false);
          return;
        }
        if (a === "undo") {
          await undo(tripId);
          return;
        }
      }
      const day = e.target.closest("[data-calendar-day]");
      if (day && !e.target.closest("[data-calendar-source],button,a"))
        openStopForm(tripId, "", "", {
          date: day.dataset.calendarDay,
          time: clock(minuteAt(day, e.clientY)),
          duration: 60,
        });
    },
    true,
  );
  document.addEventListener("keydown", async (e) => {
    if (e.key === "Escape" && drag) {
      cleanDrag();
      return;
    }
    const root = e.target.closest("#trip-calendar");
    if (!root || e.target.closest("input,textarea,select")) return;
    const source = e.target.closest("[data-calendar-source]"),
      tripId = source?.dataset.trip || root.dataset.trip,
      t = tripById(tripId);
    if (!t) return;
    if (source?.dataset.calendarSource === "place") return;
    if (source) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openStopForm(tripId, source.dataset.id);
        return;
      }
      const i = t.itinerary.find((i) => i.id === source.dataset.id);
      if (!i) return;
      const at = minutes(i.time);
      if (at === null) return;
      if (
        (e.altKey || e.target.closest("[data-calendar-resize]")) &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        if (e.target.closest("[data-calendar-resize]")) {
          await resize(
            tripId,
            i.id,
            duration(i.duration) +
              (e.key === "ArrowDown" || e.key === "ArrowRight" ? STEP : -STEP),
          );
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          await reschedule(
            tripId,
            i.id,
            i.date,
            at +
              (e.key === "ArrowDown" || e.key === "ArrowRight" ? STEP : -STEP),
          );
        } else {
          const dates = tripDates(t),
            index = dates.indexOf(i.date) + (e.key === "ArrowRight" ? 1 : -1);
          if (dates[index]) await reschedule(tripId, i.id, dates[index], at);
        }
        return;
      }
    } else if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.matches("[data-calendar-day]")
    ) {
      e.preventDefault();
      openStopForm(tripId, "", "", {
        date: e.target.dataset.calendarDay,
        time: "09:00",
      });
    }
  });
  return {
    render,
    mount,
    capture,
    noteValue,
    cancelDrag: cleanDrag,
    minutes,
    clock,
    duration,
    startFor,
    layoutEvents,
    schedulePlace,
    reschedule,
    resize,
    undo,
  };
})();
