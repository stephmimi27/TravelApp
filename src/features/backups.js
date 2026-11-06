"use strict";

/* Settings, backup validation, and restoring a local journal. */

function settings() {
  showModal(
    "Settings & backups",
    `<div class="settings-action"><div><h3>Export backup</h3><p>Download every trip, memory, photo, and plan as a backup.</p></div>${button("Export", "export", "download", "", "btn-small")}</div><div class="settings-action"><div><h3>Restore backup</h3><p>Restore a Roam backup. You’ll choose before replacing anything.</p></div>${button("Import", "import-backup", "upload", "", "btn-small")}</div><div class="settings-action"><div><h3>Instagram Stories</h3><p>Bring saved Instagram Stories into your travel journal.</p></div>${button("Import Stories", "import-stories", "instagram", "", "btn-small")}</div><div class="settings-action"><div><h3>Sample trips</h3><p>Remove example trips and keep every trip you added yourself.</p></div>${button("Clear samples", "clear-demo", "trash", "", "btn-small")}</div><div class="storage-note">${ico("lock", 14)} Your journal is saved in this browser on this device. Export a backup to move it to another device. Clearing browser data removes your saved journal. Photo and Story imports stay on your device.</div>`,
    `<button class="btn btn-primary" data-action="close-modal">Done</button>`,
  );
}
let pendingBackup = null;
function validateBackup(raw) {
  if (
    !raw ||
    raw.version !== 1 ||
    !Array.isArray(raw.trips) ||
    raw.trips.length > 300
  )
    throw new Error("This isn’t a supported Roam backup.");
  const str = (v, n = 8000) => (typeof v === "string" ? v.slice(0, n) : "");
  const date = (v) => {
    const d = str(v, 10);
    return parseDate(d) && !isNaN(parseDate(d)) ? d : "";
  };
  const arr = (v, n = 3000) => (Array.isArray(v) ? v.slice(0, n) : []);
  const amount = (v) =>
    Number.isFinite(Number(v)) ? Math.max(0, Math.min(1e8, Number(v))) : 0;
  let total = 0;
  const ids = new Set();
  return {
    version: 1,
    name: str(raw.name, 60) || "traveler",
    trips: raw.trips.map((t) => {
      if (!t || !str(t.name, 80).trim())
        throw new Error("A trip in this backup is missing its destination.");
      let id = str(t.id, 80) || uid();
      if (ids.has(id)) id = uid();
      ids.add(id);
      const start = date(t.start),
        end = date(t.end);
      if (start && end && end < start)
        throw new Error("A trip in this backup has an invalid date range.");
      const validCoords =
        t.lat !== null &&
        t.lat !== "" &&
        t.lon !== null &&
        t.lon !== "" &&
        Number.isFinite(Number(t.lat)) &&
        Number.isFinite(Number(t.lon)) &&
        Math.abs(Number(t.lat)) <= 90 &&
        Math.abs(Number(t.lon)) <= 180;
      return baseTrip({
        id,
        name: str(t.name, 80),
        country: str(t.country, 80),
        status: ["visited", "upcoming", "wishlist"].includes(t.status)
          ? t.status
          : "visited",
        scene: Object.keys(sceneNames).includes(t.scene) ? t.scene : "city",
        start,
        end,
        lat: validCoords ? Number(t.lat) : null,
        lon: validCoords ? Number(t.lon) : null,
        reflection: str(t.reflection),
        notes: str(t.notes),
        budget: amount(t.budget),
        currency: /^[A-Z]{3}$/.test(t.currency) ? t.currency : "CAD",
        demo: t.demo === true,
        memories: arr(t.memories, 1000).map((m) => {
          if (++total > 5000)
            throw new Error(
              "This backup has too many memories for one import.",
            );
          return {
            id: uid(),
            title: str(m.title, 120) || "Untitled memory",
            date: date(m.date),
            text: str(m.text, 12000),
            feeling: str(m.feeling, 100),
            favorite: !!m.favorite,
            media: safeMedia(m.media) || null,
            mediaType: m.mediaType === "video" ? "video" : "image",
            sourceKey: str(m.sourceKey, 600),
          };
        }),
        itinerary: arr(t.itinerary).map((i) => ({
          id: uid(),
          date: date(i.date),
          title: str(i.title, 160),
          time: TripCalendar.minutes(i.time) !== null ? i.time : "",
          duration: Math.min(
            TripCalendar.duration(i.duration),
            1440 - (TripCalendar.minutes(i.time) || 0),
          ),
          category: str(i.category, 80),
          website: str(i.website, 2000),
          mapLink: str(i.mapLink, 2000),
          access: str(i.access, 200),
          note: str(i.note, 2000),
          done: !!i.done,
          location: str(i.location, 500),
          cost: str(i.cost, 250),
          hours: str(i.hours, 500),
          placeId: str(i.placeId, 80),
        })),
        checklist: arr(t.checklist).map((c) => ({
          id: uid(),
          title: str(c.title, 100),
          done: !!c.done,
        })),
        places: arr(t.places, 2000).map((p) => ({
          id: str(p.id, 80) || uid(),
          name: str(p.name, 160),
          category: str(p.category, 80),
          district: str(p.district, 120),
          location: str(p.location, 500),
          cost: str(p.cost, 250),
          hours: str(p.hours, 500),
          website: str(p.website, 2000),
          mapLink: str(p.mapLink, 2000),
          access: str(p.access, 200),
          note: str(p.note, 4000),
        })),
        expenses: arr(t.expenses).map((e) => ({
          id: uid(),
          label: str(e.label, 100),
          category: str(e.category, 80),
          date: date(e.date),
          planned: amount(e.planned ?? e.amount),
          actual: amount(e.actual ?? e.amount),
        })),
      });
    }),
  };
}
$("#import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    if (file.size > 200 * 1024 * 1024)
      throw new Error("Choose a Roam backup under 200 MB.");
    pendingBackup = validateBackup(JSON.parse(await file.text()));
    showModal(
      "Restore backup?",
      `<p>This backup contains ${pendingBackup.trips.length} trips and ${pendingBackup.trips.reduce((n, t) => n + t.memories.length, 0)} memories. Restoring it will replace the journal currently saved on this device.</p><p>Export your current world first if you’d like to keep both.</p>`,
      `<button class="btn" data-action="close-modal">Cancel</button>${button("Export current journal", "export", "download")}${button("Restore this backup", "restore-backup", "check", "", "btn-primary")}`,
    );
  } catch (err) {
    toast(
      err.message || "That file couldn’t be read. Choose a Roam JSON backup.",
    );
  }
});
