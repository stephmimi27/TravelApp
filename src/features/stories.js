"use strict";

/* Import saved Story files or Instagram exports locally. */

let storySession = 0;
function openStoryImport(tripId = "") {
  storySession++;
  pendingStoryMedia = [];
  showModal(
    "Import Instagram Stories",
    `<p>Import saved Story photos and videos, or use an Instagram export.</p><div class="story-import-options">${button("Choose saved photos or videos", "story-choose-files", "camera", "", "btn-full btn-primary")}${button("Choose an Instagram export ZIP", "story-choose-zip", "upload", "", "btn-full")}${button("Choose an unzipped export folder", "story-choose-folder", "book", "", "btn-full")}</div><input id="story-files" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple hidden><input id="story-zip" type="file" accept=".zip,application/zip" hidden><input id="story-folder" type="file" webkitdirectory multiple hidden><div id="story-import-status" role="status" class="field-hint" style="margin-top:12px"></div><details class="import-help"><summary>How do I get my old Instagram Stories?</summary><p>In Instagram, open Accounts Center → Your information and permissions, then look for the option to export or download your information. Choose the Instagram account, content/Stories, your date range, and JSON format when available.</p><p>Download the export, then select the ZIP here. You can also unzip it and choose its folder. Available content depends on your archive and export settings. This importer reads Story media and any dates or titles included in its metadata; it doesn’t guess a trip from a photo.</p></details><div class="storage-note">${ico("lock", 14)} Files are read on your device. You’ll review the memories and choose a trip before saving. Import up to 40 Stories at a time; videos up to 12 MB each.</div>`,
    `<button class="btn" data-action="close-modal">Cancel</button>`,
  );
  ["files", "zip", "folder"].forEach((kind) =>
    $(`#story-${kind}`).addEventListener("change", (e) =>
      prepareStories(Array.from(e.target.files), kind, tripId, storySession),
    ),
  );
}
async function readZip(file) {
  const tail = new DataView(
    await file.slice(Math.max(0, file.size - 65558)).arrayBuffer(),
  );
  let end = -1;
  for (let p = tail.byteLength - 22; p >= 0; p--)
    if (tail.getUint32(p, true) === 0x06054b50) {
      end = p;
      break;
    }
  if (end < 0)
    throw new Error(
      "This ZIP couldn’t be read. Unzip the export and choose its folder instead.",
    );
  const count = tail.getUint16(end + 10, true),
    size = tail.getUint32(end + 12, true),
    offset = tail.getUint32(end + 16, true);
  if (count === 65535 || offset === 0xffffffff || size > 24 * 1024 * 1024)
    throw new Error(
      "This large ZIP needs to be unzipped first. Choose its folder instead.",
    );
  const central = new DataView(
      await file.slice(offset, offset + size).arrayBuffer(),
    ),
    decoder = new TextDecoder(),
    entries = [];
  for (let p = 0; p < central.byteLength; ) {
    if (central.getUint32(p, true) !== 0x02014b50) break;
    const flags = central.getUint16(p + 8, true),
      method = central.getUint16(p + 10, true),
      compressed = central.getUint32(p + 20, true),
      uncompressed = central.getUint32(p + 24, true),
      nl = central.getUint16(p + 28, true),
      el = central.getUint16(p + 30, true),
      cl = central.getUint16(p + 32, true),
      loc = central.getUint32(p + 42, true),
      name = decoder.decode(new Uint8Array(central.buffer, p + 46, nl));
    entries.push({
      name,
      uncompressed,
      async blob() {
        if (flags & 1)
          throw new Error(
            "Password-protected ZIPs aren’t supported. Unzip it first.",
          );
        if (uncompressed > 32 * 1024 * 1024)
          throw new Error("This Story is too large to import.");
        const h = new DataView(await file.slice(loc, loc + 30).arrayBuffer());
        const start = loc + 30 + h.getUint16(26, true) + h.getUint16(28, true);
        const b = file.slice(start, start + compressed);
        if (method === 0) return b;
        if (method !== 8)
          throw new Error(
            "This ZIP format isn’t supported. Choose the unzipped folder.",
          );
        let stream;
        try {
          stream = b
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw"));
        } catch {
          throw new Error(
            "Your browser can’t open this ZIP. Unzip it and choose the folder.",
          );
        }
        const chunks = [];
        let bytes = 0;
        const reader = stream.getReader();
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > 32 * 1024 * 1024) {
            await reader.cancel();
            throw new Error("This Story is too large to import.");
          }
          chunks.push(part.value);
        }
        return new Blob(chunks);
      },
    });
    p += 46 + nl + el + cl;
  }
  return entries;
}
function mediaMetadata(json) {
  const out = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (
      typeof node.uri === "string" &&
      /\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$/i.test(node.uri)
    ) {
      out.push({
        uri: node.uri,
        date: Number(node.creation_timestamp) || 0,
        title: typeof node.title === "string" ? node.title : "",
      });
    }
    for (const [k, v] of Object.entries(node))
      if (typeof v === "object") walk(v);
  }
  walk(json);
  return out;
}
function decodeMetaText(s) {
  try {
    if (/[ÃÂ]/.test(s))
      return new TextDecoder().decode(
        Uint8Array.from(s, (c) => c.charCodeAt(0)),
      );
  } catch {}
  return s;
}
async function prepareStories(files, kind, tripId, session) {
  if (!files.length) return;
  const status = $("#story-import-status");
  status.textContent = "Reading Story files…";
  document
    .querySelectorAll(".story-import-options button")
    .forEach((b) => (b.disabled = true));
  try {
    let entries;
    if (kind === "zip") entries = await readZip(files[0]);
    else
      entries = files.map((f) => ({
        name: f.webkitRelativePath || f.name,
        uncompressed: f.size,
        lastModified: f.lastModified,
        blob: async () => f,
      }));
    let metadata = [];
    for (const e of entries
      .filter((e) => /(^|\/)[^/]*stor(?:y|ies)[^/]*\.json$/i.test(e.name))
      .slice(0, 10)) {
      if (e.uncompressed > 10 * 1024 * 1024) continue;
      try {
        metadata.push(
          ...mediaMetadata(JSON.parse(await (await e.blob()).text())),
        );
      } catch (err) {
        console.warn("Story metadata unavailable", err.message);
      }
    }
    const mediaEntries = entries.filter(
      (e) =>
        /\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$/i.test(e.name) &&
        (kind === "files" ||
          /(^|\/)stories\//i.test(e.name) ||
          metadata.some((m) => e.name.endsWith(m.uri))),
    );
    if (!mediaEntries.length)
      throw new Error(
        "No Story photos or videos were found. Choose saved Story files, or an export containing Stories.",
      );
    const selected = mediaEntries.slice(0, 40);
    const prepared = [];
    let skipped = 0;
    for (let i = 0; i < selected.length; i++) {
      if (session !== storySession || !modal.open) return;
      status.textContent = `Getting memory ${i + 1} of ${selected.length} ready…`;
      const e = selected[i],
        meta = metadata.find((m) => e.name.endsWith(m.uri)),
        ext = e.name.split(".").pop().toLowerCase(),
        video = ["mp4", "mov", "webm"].includes(ext),
        mime = video
          ? { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" }[
              ext
            ]
          : {
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              png: "image/png",
              webp: "image/webp",
              gif: "image/gif",
            }[ext];
      try {
        if (video && e.uncompressed > 12 * 1024 * 1024) {
          skipped++;
          continue;
        }
        const file = new File([await e.blob()], e.name.split("/").pop(), {
          type: mime,
        });
        const media = await mediaData(file);
        let date = "";
        if (meta?.date && Number.isFinite(new Date(meta.date * 1000).getTime()))
          date = localDate(new Date(meta.date * 1000));
        const match = e.name.match(/(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)/);
        if (!date && match) {
          const candidate = `${match[1]}-${match[2]}-${match[3]}`;
          if (parseDate(candidate) && !isNaN(parseDate(candidate)))
            date = candidate;
        }
        prepared.push({
          id: uid(),
          title:
            decodeMetaText(meta?.title || "")
              .trim()
              .slice(0, 120) || "Imported Story",
          date: date || today(),
          dateKnown: !!date,
          text: "",
          feeling: "Happy",
          media,
          mediaType: video ? "video" : "image",
          favorite: false,
          sourceKey: `instagram:${meta?.uri || e.name}:${e.uncompressed}`,
        });
      } catch (err) {
        skipped++;
      }
    }
    if (session !== storySession || !modal.open) return;
    if (!prepared.length)
      throw new Error(
        "These files couldn’t be imported. Try JPG/PNG photos or MP4 videos under 12 MB.",
      );
    pendingStoryMedia = prepared;
    const preferred =
      tripById(tripId) ||
      state.trips.find((t) => !t.demo && t.status === "visited") ||
      state.trips.find((t) => t.status === "visited");
    showModal(
      "Review imported Stories",
      `<p>${prepared.length} ${prepared.length === 1 ? "Story is" : "Stories are"} ready. ${skipped ? `${skipped} unsupported or oversized files were skipped. ` : ""}${mediaEntries.length > 40 ? "The first 40 files were selected. " : ""}Choose a trip, review the dates, and select the files to import.</p>${state.trips.length ? `<div class="form-field"><label for="story-destination">Destination trip</label><select id="story-destination">${tripOptions(preferred?.id)}</select></div>` : '<p class="field-hint">Add a trip first, then come back to import these Stories.</p>'}<div class="story-review">${prepared.map((m, i) => `<label class="story-review-item"><input type="checkbox" data-story-index="${i}" checked><div class="story-thumb">${m.mediaType === "video" ? ico("video", 25) : `<img src="${safeMedia(m.media)}" alt="Story ${i + 1} preview">`}</div><span><strong>${esc(m.title)}</strong><small>${fmtDate(m.date)}${!m.dateKnown ? " · date not found; using today" : ""} · ${m.mediaType === "video" ? "video" : "photo"}</small></span></label>`).join("")}</div><p class="field-hint" style="margin-top:14px">You can edit titles, dates, and reflections after importing. Duplicate Story files in this trip are skipped.</p>`,
      `<button class="btn" data-action="close-modal">Cancel</button>${state.trips.length ? button("Import selected Stories", "save-stories", "heart", "", "btn-primary") : button("Add a trip first", "add-trip", "plus", "", "btn-primary")}`,
    );
  } catch (err) {
    if (session === storySession && modal.open) {
      status.textContent =
        err.message ||
        "Couldn’t read that export. Try saved photos or an unzipped folder.";
      document
        .querySelectorAll(".story-import-options button")
        .forEach((b) => (b.disabled = false));
    }
  }
}
async function saveStories(btn) {
  const tid = $("#story-destination")?.value;
  if (!tid) {
    toast("Choose a trip for these Stories.");
    return;
  }
  const indexes = [
    ...document.querySelectorAll("[data-story-index]:checked"),
  ].map((x) => Number(x.dataset.storyIndex));
  if (!indexes.length) {
    toast("Select at least one Story to import.");
    return;
  }
  btn.disabled = true;
  let count = 0;
  const ok = await mutate((s) => {
    const t = s.trips.find((x) => x.id === tid);
    for (const i of indexes) {
      const m = pendingStoryMedia[i];
      if (m && !t.memories.some((x) => x.sourceKey === m.sourceKey)) {
        const { dateKnown, ...memory } = m;
        t.memories.push(memory);
        count++;
      }
    }
  }, "Stories imported.");
  if (ok) {
    closeModal();
    navigate(`#trip/${tid}`);
    if (!count) toast("These Stories are already in this trip.");
  } else btn.disabled = false;
}
