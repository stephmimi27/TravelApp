"use strict";

/* Date, time, and amount formatting used across views. */

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => localDate();
const parseDate = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? new Date(`${v}T12:00:00`) : null;
const fmtDate = (
  v,
  opts = { month: "short", day: "numeric", year: "numeric" },
) => parseDate(v)?.toLocaleDateString("en-CA", opts) || "Dates not set";
const dateRange = (t) =>
  t.start
    ? `${fmtDate(t.start, { month: "short", day: "numeric" })}${t.end && t.end !== t.start ? ` – ${fmtDate(t.end, { month: "short", day: "numeric" })}` : ""}, ${t.start.slice(0, 4)}`
    : "Dates not set";
const money = (v, c = "CAD") =>
  `${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 }).format(Number(v) || 0)} ${c}`;
function daysAway(t) {
  if (!t.start) return "Dates not set";
  const n = Math.ceil((parseDate(t.start) - parseDate(today())) / 86400000);
  return n > 0
    ? `${n} days away`
    : n === 0
      ? "Starts today"
      : t.end && t.end >= today()
        ? "In progress"
        : "Trip ended";
}
function tripDates(t) {
  const dates = [];
  if (t.start) {
    let d = parseDate(t.start);
    const end = parseDate(t.end || t.start);
    for (let i = 0; d <= end && i < 90; i++) {
      dates.push(localDate(d));
      d.setDate(d.getDate() + 1);
    }
  }
  t.itinerary.forEach((i) => {
    if (i.date && !dates.includes(i.date)) dates.push(i.date);
  });
  return dates.sort();
}
