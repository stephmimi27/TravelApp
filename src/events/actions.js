"use strict";

/* Delegated button actions. Feature implementations live in their own folders. */

document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const a = target.dataset.action,
    tid = target.dataset.trip,
    id = target.dataset.id,
    t = tripById(tid);
  if (target.closest("form") && target.getAttribute("type") !== "submit")
    e.preventDefault();
  const context = location.hash.startsWith("#trip/")
    ? location.hash.split("/")[1]
    : "";
  if (await Planner.action(a, { target, t, tid, id })) return;
  switch (a) {
    case "add-trip":
      openTripForm("", target.dataset.status || "visited");
      break;
    case "add-plan":
      openTripForm("", "upcoming");
      break;
    case "edit-trip":
      openTripForm(tid);
      break;
    case "open-trip":
      if (t)
        navigate(t.status === "visited" ? `#trip/${t.id}` : `#planner/${t.id}`);
      break;
    case "close-modal":
      closeModal();
      break;
    case "add-memory":
      openMemoryForm(tid || context);
      break;
    case "edit-memory":
      openMemoryForm(tid, id);
      break;
    case "read-memory":
      readMemory(tid, id);
      break;
    case "favorite":
      await mutate((s) => {
        const m = s.trips
          .find((p) => p.id === tid)
          ?.memories.find((m) => m.id === id);
        if (m) m.favorite = !m.favorite;
      });
      break;
    case "favorites-only":
      favoritesOnly = !favoritesOnly;
      renderJournal();
      break;
    case "map-filter":
      mapFilter = target.dataset.filter;
      renderWorld();
      break;
    case "zoom-in":
      mapZoom = Math.min(1.5, mapZoom + 0.25);
      renderWorld();
      break;
    case "zoom-out":
      mapZoom = Math.max(1, mapZoom - 0.25);
      renderWorld();
      break;
    case "select-day":
      selectedDay[tid] = target.dataset.date;
      renderItinerary(t);
      break;
    case "confirm-remove-calendar-item":
      confirmDialog(
        "Remove itinerary item?",
        "Remove this item from the itinerary? The saved place will remain in Places to explore.",
        "remove-calendar-item",
        `data-trip="${esc(tid)}" data-id="${esc(id)}"`,
      );
      break;
    case "remove-calendar-item":
      if (
        await mutate((s) => {
          const p = s.trips.find((x) => x.id === tid);
          p.itinerary = p.itinerary.filter((x) => x.id !== id);
        }, "Itinerary item removed.")
      )
        closeModal();
      break;
    case "add-stop":
      openStopForm(tid);
      break;
    case "edit-stop":
      openStopForm(tid, id);
      break;
    case "remove-stop":
      await mutate((s) => {
        const p = s.trips.find((x) => x.id === tid);
        p.itinerary = p.itinerary.filter((x) => x.id !== id);
      }, "Item removed.");
      break;
    case "toggle-stop":
      await mutate((s) => {
        const i = s.trips
          .find((x) => x.id === tid)
          ?.itinerary.find((x) => x.id === id);
        if (i) i.done = !i.done;
      });
      break;
    case "toggle-check":
      await mutate((s) => {
        const i = s.trips
          .find((x) => x.id === tid)
          ?.checklist.find((x) => x.id === id);
        if (i) i.done = !i.done;
      });
      break;
    case "remove-check":
      await mutate((s) => {
        const p = s.trips.find((x) => x.id === tid);
        p.checklist = p.checklist.filter((x) => x.id !== id);
      });
      break;
    case "add-expense":
      openExpenseForm(tid);
      break;
    case "remove-expense":
      await mutate((s) => {
        const p = s.trips.find((x) => x.id === tid);
        p.expenses = p.expenses.filter((x) => x.id !== id);
      }, "Expense removed.");
      break;
    case "save-notes": {
      const note = $("#plan-notes").value.slice(0, 8000);
      await mutate(
        (s) => (s.trips.find((x) => x.id === tid).notes = note),
        "Notes saved.",
      );
      break;
    }
    case "complete-trip":
      if (!t) break;
      if (t.status === "wishlist") {
        await mutate(
          (s) => (s.trips.find((x) => x.id === tid).status = "upcoming"),
          "Moved to upcoming trips.",
        );
      } else {
        showModal(
          "Complete trip",
          `<p>Move ${esc(t.name)} into your past trips? Your itinerary, checklist, and budget will stay with the trip. You can add photos and notes after completing it.</p>`,
          `<button class="btn" data-action="close-modal">Cancel</button>${button("Complete trip", "mark-visited", "flag", `data-trip="${esc(tid)}"`, "btn-primary")}`,
        );
      }
      break;
    case "mark-visited":
      if (
        await mutate(
          (s) => (s.trips.find((x) => x.id === tid).status = "visited"),
          "Trip marked complete.",
        )
      ) {
        closeModal();
        navigate(`#trip/${tid}`);
      }
      break;
    case "confirm-delete-trip":
      confirmDialog(
        "Delete trip?",
        `Remove ${esc(t?.name)} and its memories, plans, and photos from this device? This can’t be undone. Export a backup first if you want to keep a copy.`,
        "delete-trip",
        `data-trip="${esc(tid)}"`,
      );
      break;
    case "delete-trip":
      if (
        await mutate((s) => {
          s.trips = s.trips.filter((x) => x.id !== tid);
        }, "Trip deleted.")
      ) {
        closeModal();
        navigate("#world");
      }
      break;
    case "confirm-delete-memory":
      confirmDialog(
        "Delete memory?",
        "This removes this memory and its attachment from your journal. It can’t be undone.",
        "delete-memory",
        `data-trip="${esc(tid)}" data-id="${esc(id)}"`,
      );
      break;
    case "delete-memory":
      if (
        await mutate((s) => {
          const p = s.trips.find((x) => x.id === tid);
          p.memories = p.memories.filter((x) => x.id !== id);
        }, "Memory removed.")
      )
        closeModal();
      break;
    case "remove-memory-media":
      pendingMemoryMedia = null;
      pendingMemoryType = "image";
      $("#memory-photo").value = "";
      $("#memory-preview").classList.remove("visible");
      $("#memory-file-status").textContent = "Attachment removed.";
      break;
    case "clear-demo":
      if (!state.trips.some((t) => t.demo)) {
        toast("No sample trips to remove.");
        break;
      }
      showModal(
        "Remove sample trips?",
        `<p>Remove the sample trips and all content inside them, including memories added to those trips? Every trip you created yourself will stay.</p>`,
        `<button class="btn" data-action="close-modal">Cancel</button>${button("Remove samples", "delete-demo", "sparkle", "", "btn-primary")}`,
      );
      break;
    case "delete-demo":
      if (
        await mutate((s) => {
          s.trips = s.trips.filter((t) => !t.demo);
        }, "Sample trips removed.")
      ) {
        closeModal();
        navigate("#world");
      }
      break;
    case "export": {
      const blob = new Blob(
        [
          JSON.stringify(
            { app: "roam", exportedAt: new Date().toISOString(), ...state },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `air-time-journal-${today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast("Backup ready.");
      break;
    }
    case "import-backup":
      $("#import-file").click();
      break;
    case "restore-backup":
      if (!pendingBackup) break;
      if (
        await mutate((s) => {
          s.version = 1;
          s.name = pendingBackup.name;
          s.trips = pendingBackup.trips;
        }, "Backup restored.")
      ) {
        pendingBackup = null;
        closeModal();
        navigate("#world");
      }
      break;
    case "import-stories":
      openStoryImport(tid || context);
      break;
    case "story-choose-files":
      $("#story-files").click();
      break;
    case "story-choose-zip":
      $("#story-zip").click();
      break;
    case "story-choose-folder":
      $("#story-folder").click();
      break;
    case "save-stories":
      await saveStories(target);
      break;
  }
});
