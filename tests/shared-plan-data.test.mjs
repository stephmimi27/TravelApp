import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const context = createContext({ URL, document: { addEventListener() {} } });
for (const file of [
  "src/lib/dates.js",
  "src/data/destinations.js",
  "src/components/calendar.js",
  "src/features/shared-plan-data.js",
]) {
  const path = new URL(`../${file}`, import.meta.url);
  runInContext(readFileSync(path, "utf8"), context, { filename: file });
}
const project = (trip) => {
  context.trip = trip;
  return JSON.parse(runInContext("JSON.stringify(sharedPlanData(trip))", context));
};

const trip = {
  name: "Kyoto",
  country: "Japan",
  scene: "japan",
  start: "2027-04-04",
  end: "2027-04-07",
  reflection: "Private reflection",
  notes: "Private notes",
  expenses: [{ amount: 500 }],
  budget: 1000,
  memories: [{ media: "data:image/png;base64,abc", sourceKey: "private-key" }],
  itinerary: [
    {
      title: "Tea break",
      date: "2027-04-04",
      time: 540,
      placeId: "place-local-id",
      location: "Higashiyama",
      note: "Book a window seat",
      mapLink: "https://maps.example/tea",
      website: "data:text/html,<script></script>",
      sourceKey: "private-key",
    },
    { title: "Walk", date: "2027-04-07", time: "23:30", duration: "60" },
    { title: "Late train", date: "2027-04-07", time: "23:43", duration: 60 },
  ],
  places: [
    {
      id: "place-local-id",
      name: "Tea house",
      category: "Food",
      district: "East side",
      cost: "$10–15",
      hours: "10–6",
      website: "https://tea.example/menu",
      mapLink: "https://name:secret@maps.example/tea",
      access: "Walk from the station",
      note: "Closed on Mondays",
      media: "data:image/png;base64,abc",
    },
  ],
  checklist: [{ id: "task-local-id", title: "Book transport", done: true }],
};

const output = project(trip);
assert.deepEqual(Object.keys(output).sort(), [
  "checklist", "country", "end", "itinerary", "name", "placesToExplore", "scene", "start",
]);
assert.deepEqual(output.itinerary[0], {
  title: "Tea break",
  date: "2027-04-04",
  time: "09:00",
  duration: 60,
  category: "Food",
  location: "Higashiyama",
  cost: "",
  hours: "",
  website: "",
  mapLink: "https://maps.example/tea",
  access: "",
  note: "Book a window seat",
  done: false,
});
assert.equal(output.itinerary[1].duration, 30);
assert.equal(output.itinerary[2].duration, 17);
assert.deepEqual(output.placesToExplore[0], {
  name: "Tea house",
  category: "Food",
  district: "East side",
  location: "",
  cost: "$10–15",
  hours: "10–6",
  website: "https://tea.example/menu",
  mapLink: "",
  access: "Walk from the station",
  note: "Closed on Mondays",
});
assert.deepEqual(output.checklist, [{ title: "Book transport", done: true }]);
assert.deepEqual(project(output), output, "Fetched plans normalize to the same payload.");
assert.equal(trip.places[0].id, "place-local-id", "Existing local records retain their IDs.");

const malformed = project({
  name: "  Kyoto  ",
  scene: "__proto__",
  start: "2027-02-29",
  end: "2027-03-04",
  itinerary: [null, { title: {} }, { title: "A stop", time: "24:30", duration: {} }],
  placesToExplore: {},
  checklist: [null, { title: "Pack luggage", done: "false" }],
});
assert.equal(malformed.name, "Kyoto");
assert.equal(malformed.scene, "city");
assert.equal(malformed.start, "");
assert.equal(malformed.end, "");
assert.equal(malformed.itinerary.length, 1);
assert.equal(malformed.itinerary[0].time, "");
assert.equal(malformed.itinerary[0].duration, 60);
assert.deepEqual(malformed.placesToExplore, []);
assert.deepEqual(malformed.checklist, [{ title: "Pack luggage", done: false }]);
assert.throws(() => project(null), /destination/);

console.log("Passed: shared plan privacy and legacy planner data.");
