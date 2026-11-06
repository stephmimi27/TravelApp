"use strict";

/* Shared buttons, empty states, page headings, and dialogs. */

function toast(s) {
  clearTimeout(toastTimer);
  $("#toast").textContent = s;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 4500);
}
function button(text, action, icon = "plus", attrs = "", cls = "") {
  return `<button class="btn ${cls}" data-action="${action}" ${attrs}>${ico(icon, 15)}${text}</button>`;
}
function empty(title, text, action = "", label = "Add a trip") {
  return `<div class="empty"><span>${ico("compass", 40)}</span><h2>${title}</h2><p>${text}</p>${action ? button(label, action, "plus", "", "btn-primary") : ""}</div>`;
}
function demoNotice() {
  return state.trips.some((t) => t.demo)
    ? `<div class="demo-notice"><span>${ico("sparkle")} Sample trips are shown. Add your own trips or clear the samples.</span><button data-action="clear-demo">Clear sample trips</button></div>`
    : "";
}
function pageHero(eyebrow, title, subtitle, actions = "") {
  return `<div class="hero"><div><div class="eyebrow">${ico("sparkle", 13)}${eyebrow}</div><h1>${title}</h1><p class="hero-sub">${subtitle}</p></div>${actions ? `<div class="hero-actions">${actions}</div>` : ""}</div>`;
}
function showModal(title, body, footer = "", formId = "") {
  $("#modal-content").innerHTML =
    `${formId ? `<form id="${formId}">` : ""}<div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-btn" type="button" data-action="close-modal" aria-label="Close dialog">${ico("close", 16)}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ""}${formId ? "</form>" : ""}`;
  if (!modal.open) modal.showModal();
}
function closeModal() {
  modal.close();
  pendingStoryMedia = [];
}
function field(
  label,
  name,
  value = "",
  type = "text",
  attrs = "",
  full = false,
) {
  return `<div class="form-field ${full ? "full" : ""}"><label for="field-${name}">${label}</label><input id="field-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}></div>`;
}
function tripOptions(selected = "", visitedOnly = false) {
  return state.trips
    .filter((t) => !visitedOnly || t.status === "visited")
    .map(
      (t) =>
        `<option value="${esc(t.id)}" ${t.id === selected ? "selected" : ""}>${esc(t.name)}${t.demo ? " (sample)" : ""}</option>`,
    )
    .join("");
}
function confirmDialog(title, text, action, attrs = "") {
  showModal(
    title,
    `<p>${text}</p>`,
    `<button class="btn" data-action="close-modal">Cancel</button>${button("Yes, remove it", action, "trash", attrs, "danger")}`,
  );
}
