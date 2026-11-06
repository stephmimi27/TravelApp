"use strict";

/* Trip card shared by trip lists. */

function tripCard(t) {
  return `<a href="#trip/${esc(t.id)}" class="trip-card"><div class="card-scene">${Art.scene(t.scene)}<span class="trip-label">${esc(t.country)}${t.demo ? " · SAMPLE" : ""}</span><span class="postmark">${t.start ? t.start.slice(0, 4) : "PAST TRIP"}</span></div><div class="trip-card-body"><div class="trip-card-title"><h3>${esc(t.name)}</h3>${ico("arrow", 17)}</div><div class="location">${dateRange(t)}</div><p>${esc(t.reflection || "No trip notes added.")}</p><div class="trip-card-meta"><span>${ico("camera", 11)}${t.memories.length} memories</span><span>${ico("heart", 11)}${t.memories.filter((m) => m.favorite).length} favorites</span></div></div></a>`;
}
