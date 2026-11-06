"use strict";

/* Shared DOM selectors, escaping, IDs, and icons. */

const $ = (s, root = document) => root.querySelector(s);
const esc = (v = "") =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () =>
  crypto.randomUUID?.() ||
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
const ico = (n, s = 18, f = false) => Art.icon(n, s, f);
