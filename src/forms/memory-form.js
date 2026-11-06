"use strict";

/* Add, edit, and read memories with local photo/video attachments. */

let pendingMemoryMedia = null,
  pendingMemoryType = "image";
function openMemoryForm(tripId = "", memoryId = "") {
  if (!state.trips.length) {
    openTripForm();
    toast("Add a trip before saving a memory.");
    return;
  }
  const selected =
      tripById(tripId) ||
      state.trips.find((t) => t.status === "visited") ||
      state.trips[0],
    old = selected.memories.find((m) => m.id === memoryId),
    m = old || {
      title: "",
      date: today(),
      text: "",
      feeling: "Happy",
      media: null,
      mediaType: "image",
    };
  pendingMemoryMedia = m.media;
  pendingMemoryType = m.mediaType || "image";
  showModal(
    old ? "Edit memory" : "Add a memory",
    `<div class="form-grid"><div class="form-field full"><label for="memory-trip">Trip</label><select name="trip" id="memory-trip" ${old ? "disabled" : ""}>${tripOptions(selected.id)}</select></div>${field("Title", "title", m.title, "text", 'required maxlength="120"', true)}${field("Date", "date", m.date, "date", "required")}<div class="form-field"><label for="memory-feeling">Mood</label><select id="memory-feeling" name="feeling">${["Happy", "Impressed", "Relaxed", "Excited", "Curious", "Nostalgic", "With friends"].map((f) => `<option ${feelingLabel(m.feeling) === f ? "selected" : ""}>${f}</option>`).join("")}</select></div><div class="form-field full"><label for="memory-text">Notes</label><textarea id="memory-text" name="text" maxlength="12000" placeholder="What happened, who you were with, or anything else you want to record">${esc(m.text)}</textarea></div><div class="form-field full"><label for="memory-photo">A photo or saved Story (optional)</label><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" id="memory-photo"><span class="field-hint">Photos are resized for your journal. Videos can be up to 12 MB.</span><img id="memory-preview" class="memory-preview ${m.media && m.mediaType !== "video" ? "visible" : ""}" src="${m.media && m.mediaType !== "video" ? safeMedia(m.media) : ""}" alt="Selected photo preview"><div id="memory-file-status" class="field-hint">${m.mediaType === "video" && m.media ? "Video attached." : ""}</div>${m.media ? '<button type="button" class="text-link" data-action="remove-memory-media">Remove attachment</button>' : ""}</div></div>`,
    `${old ? button("Delete memory", "confirm-delete-memory", "trash", `data-trip="${esc(selected.id)}" data-id="${esc(m.id)}" type="button"`, "btn-small danger") : ""}<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">${ico("heart", 15)} Save memory</button>`,
    "memory-form",
  );
  $("#memory-form").dataset.trip = selected.id;
  $("#memory-form").dataset.id = memoryId;
  $("#memory-photo").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const submit = $("#memory-form button[type=submit]");
    submit.disabled = true;
    try {
      pendingMemoryMedia = await mediaData(f);
      pendingMemoryType = f.type.startsWith("video/") ? "video" : "image";
      $("#memory-preview").src =
        pendingMemoryType === "image" ? pendingMemoryMedia : "";
      $("#memory-preview").classList.toggle(
        "visible",
        pendingMemoryType === "image",
      );
      $("#memory-file-status").textContent =
        pendingMemoryType === "video" ? "Video attached." : "Photo attached.";
    } catch (err) {
      e.target.value = "";
      toast(err.message);
    } finally {
      submit.disabled = false;
    }
  });
}
function readMemory(tripId, id) {
  const t = tripById(tripId),
    m = t?.memories.find((x) => x.id === id);
  if (!m) return;
  showModal(
    esc(m.title),
    `<div class="memory-reading-photo">${m.media ? (m.mediaType === "video" ? `<video src="${safeMedia(m.media)}" controls playsinline style="width:100%;height:100%;object-fit:contain"></video>` : `<img src="${safeMedia(m.media)}" alt="${esc(m.title)}">`) : Art.scene(t.scene)}</div><div class="memory-reading-meta">${esc(t.name)} · ${fmtDate(m.date)} · ${esc(feelingLabel(m.feeling))}${t.demo ? " · SAMPLE MEMORY" : ""}</div><div class="memory-reading-text">${esc(m.text || "No notes added.")}</div>`,
    button(
      "Edit this memory",
      "edit-memory",
      "edit",
      `data-trip="${esc(tripId)}" data-id="${esc(id)}"`,
    ) +
      `<button class="btn btn-primary" data-action="close-modal">Close</button>`,
  );
}
