"use strict";

/* Application state, IndexedDB persistence, and serialized updates. Keep the existing DB name and key. */

let state,
  db,
  persistent = true,
  toastTimer,
  selectedDay = {},
  journalSearch = "",
  journalTrip = "",
  favoritesOnly = false,
  mapFilter = "all",
  mapZoom = 1,
  pendingStoryMedia = [];
const main = $("#main"),
  modal = $("#modal");
async function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("roam-travel-journal", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("journal");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(new Error("Please close other Roam tabs and reload."));
  });
}
async function readDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("journal", "readonly");
    const r = tx.objectStore("journal").get("world");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function writeDB(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("journal", "readwrite");
    tx.objectStore("journal").put(data, "world");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Save interrupted"));
  });
}
let saveQueue = Promise.resolve();
function mutate(fn, message) {
  const task = saveQueue.then(async () => {
    try {
      const next = structuredClone(state);
      fn(next);
      if (persistent) await writeDB(next);
      state = next;
      render();
      if (message) toast(message);
      return true;
    } catch (e) {
      toast("Couldn’t save that change. Free up device space, then try again.");
      return false;
    }
  });
  saveQueue = task.catch(() => {});
  return task;
}
const tripById = (id) => state.trips.find((t) => t.id === id);
const allMemories = () =>
  state.trips.flatMap((t) => t.memories.map((m) => ({ ...m, trip: t })));
const ready = (t) =>
  `${t.checklist.filter((c) => c.done).length}/${t.checklist.length}`;
