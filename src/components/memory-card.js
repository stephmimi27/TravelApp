"use strict";

/* Photo and video memory cards. */

function memoryCard(m) {
  const t = m.trip;
  return `<article class="memory-card"><div class="memory-tape"></div><button class="memory-open" data-action="read-memory" data-trip="${esc(t.id)}" data-id="${esc(m.id)}"><div class="memory-image">${m.media ? (m.mediaType === "video" ? `<video src="${safeMedia(m.media)}" preload="metadata" muted playsinline aria-label="Video memory"></video><span class="video-badge">${ico("video", 16)} VIDEO</span>` : `<img src="${safeMedia(m.media)}" alt="${esc(m.title)}" loading="lazy">`) : Art.scene(t.scene)}</div><h3>${esc(m.title)}</h3><p>${esc(m.text || "No notes added.")}</p></button><div class="memory-footer"><span>${esc(t.name)} · ${fmtDate(m.date, { month: "short", day: "numeric" })}</span><button class="favorite-btn ${m.favorite ? "is-favorite" : ""}" data-action="favorite" data-trip="${esc(t.id)}" data-id="${esc(m.id)}" aria-label="${m.favorite ? "Remove from" : "Add to"} favorites" aria-pressed="${!!m.favorite}">${ico("heart", 17, !!m.favorite)}</button></div></article>`;
}
