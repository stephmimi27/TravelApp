import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

// Exercise data/import contracts without replacing the app's browser workflow.
const nodes = new Map();
function node(selector) {
  if (!nodes.has(selector))
    nodes.set(selector, {
      innerHTML: "",
      textContent: "",
      value: "",
      dataset: {},
      className: "",
      open: false,
      addEventListener() {},
      querySelector() {
        return node("child");
      },
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
      classList: { add() {}, remove() {}, toggle() {} },
    });
  return nodes.get(selector);
}
const document = {
  querySelector: node,
  querySelectorAll: () => [],
  addEventListener() {},
  title: "",
};
const context = vm.createContext({
  console,
  crypto: webcrypto,
  document,
  location: { hash: "#planner/demo-kyoto" },
  window: {},
  setTimeout: () => 0,
  clearTimeout() {},
  Blob,
  DecompressionStream,
  TextDecoder,
  Uint8Array,
  DataView,
  structuredClone,
  URL,
  Date,
});
const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(
  (match) => match[1],
);
for (const file of scripts) {
  const source = fs.readFileSync(file, "utf8");
  vm.runInContext(
    file === "src/main.js"
      ? source.split("/* Start the app after every feature has loaded. */")[0]
      : source,
    context,
    { filename: file },
  );
}
vm.runInContext("persistent=false;state=demoData();", context);
const run = (code) => vm.runInContext(code, context);
assert.equal(run('safeMedia("javascript:alert(1)")'), "");
assert.equal(run('safeMedia("data:image/svg+xml;base64,PHN2Zz4=")'), "");
assert.throws(() => run("validateBackup({version:2,trips:[]})"));
run(
  `state.trips.find(t=>t.id==='demo-kyoto').places=[{id:'place-test',name:'A <quiet> café',category:'Food',district:'East side',location:'12 Little Street',cost:'$5–10',hours:'09:00–17:00',note:'A small courtyard',website:'https://example.com',mapLink:'',access:'Transit'}];`,
);
const restored = run("validateBackup(state)");
assert.equal(
  restored.trips.find((t) => t.id === "demo-kyoto").places[0].location,
  "12 Little Street",
);
assert.equal(
  restored.trips.find((t) => t.id === "demo-kyoto").expenses[0].planned,
  620,
);
run('renderPlanner("demo-kyoto")');
assert.match(node("#main").innerHTML, /The itinerary/);
assert.match(node("#main").innerHTML, /Trip itinerary calendar/);
assert.match(node("#main").innerHTML, /Saved place categories/);
await run(
  `Planner.action('schedule-place',{target:{dataset:{}},t:tripById('demo-kyoto'),tid:'demo-kyoto',id:'place-test'})`,
);
assert.match(node("#modal-content").innerHTML, /A &lt;quiet&gt; café/);
assert.match(node("#modal-content").innerHTML, /12 Little Street/);
context.pasteForm = {
  id: "paste-places-form",
  dataset: { trip: "demo-kyoto" },
};
context.pasteData = new Map([
  [
    "rows",
    'Name\tCategory\tMap\tHours\tCost\tWebsite\tNotes\nLittle museum\tCulture\thttps://maps.example.com/museum\t10–5\tFree\thttps://example.com/museum\t"First line\nSecond line"',
  ],
]);
await run("Planner.submit(pasteForm,pasteData)");
assert.equal(
  run("tripById('demo-kyoto').places.at(-1).note"),
  "First line\nSecond line",
);
assert.equal(run("tripById('demo-kyoto').places.at(-1).category"), "Culture");
assert.equal(run("tripById('demo-kyoto').places.at(-1).mapLink"), "https://maps.example.com/museum");
assert.equal(run("tripById('demo-kyoto').places.at(-1).hours"), "10–5");
assert.equal(run("tripById('demo-kyoto').places.at(-1).cost"), "Free");
assert.equal(run("tripById('demo-kyoto').places.at(-1).website"), "https://example.com/museum");
// Verify the downloaded TSV can be pasted back into the same seven columns.
let exportedPlaces;
const originalCreateObjectURL = URL.createObjectURL;
URL.createObjectURL = (blob) => { exportedPlaces = blob; return "blob:test-export"; };
document.createElement = () => ({ click() {} });
try {
  await run("Planner.action('export-places',{t:tripById('demo-kyoto')})");
} finally {
  URL.createObjectURL = originalCreateObjectURL;
}
const exportedText = await exportedPlaces.text();
assert.ok(exportedText.startsWith("Name\tCategory\tMap\tHours\tCost\tWebsite\tNotes\r\n"));
assert.ok(exportedText.includes('Little museum\tCulture\thttps://maps.example.com/museum\t10–5\tFree\thttps://example.com/museum\t"First line\nSecond line"'));
context.expenseForm = {
  id: "tracked-expense-form",
  dataset: { trip: "demo-kyoto" },
};
context.expenseData = new Map([
  ["label", "A little lunch"],
  ["category", "Food"],
  ["date", "2027-04-04"],
  ["planned", "30"],
  ["actual", "24"],
]);
await run("Planner.submit(expenseForm,expenseData)");
assert.equal(run("tripById('demo-kyoto').expenses.at(-1).planned"), 30);
assert.equal(run("tripById('demo-kyoto').expenses.at(-1).actual"), 24);
const meta = run(
  `mediaMetadata({ig_stories:[{uri:'media/stories/a.jpg',creation_timestamp:1786572000,title:'A tiny moment'}]})`,
);
assert.equal(meta[0].title, "A tiny moment");
assert.equal(meta[0].date, 1786572000);
// A stored ZIP exercises central-directory offsets and local-file extraction.
const filename = Buffer.from("stories.json"),
  payload = Buffer.from('{"ig_stories":[]}');
const header = Buffer.alloc(30);
header.writeUInt32LE(0x04034b50, 0);
header.writeUInt32LE(payload.length, 18);
header.writeUInt32LE(payload.length, 22);
header.writeUInt16LE(filename.length, 26);
const central = Buffer.alloc(46);
central.writeUInt32LE(0x02014b50, 0);
central.writeUInt32LE(payload.length, 20);
central.writeUInt32LE(payload.length, 24);
central.writeUInt16LE(filename.length, 28);
const local = Buffer.concat([header, filename, payload]),
  directory = Buffer.concat([central, filename]),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(1, 8);
end.writeUInt16LE(1, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(local.length, 16);
context.zipFixture = new Blob([local, directory, end]);
const zip = await run("readZip(zipFixture)");
assert.equal(await (await zip[0].blob()).text(), payload.toString());
// Calendar operations use the same save path as pointer and keyboard interactions.
const initialCount = run("tripById('demo-kyoto').itinerary.length");
const scheduled = await run(
  "TripCalendar.schedulePlace('demo-kyoto','place-test','2027-04-04','10:15',90)",
);
assert.ok(scheduled);
context.calendarEventId = scheduled;
let entry = run(
  "tripById('demo-kyoto').itinerary.find(i=>i.id===calendarEventId)",
);
assert.equal(entry.placeId, "place-test");
assert.equal(entry.time, "10:15");
assert.equal(entry.duration, 90);
assert.equal(entry.location, "12 Little Street");
assert.equal(entry.cost, "$5–10");
assert.equal(entry.note, "A small courtyard");
assert.equal(entry.website, "https://example.com");
assert.equal(entry.category, "Food");
assert.equal(run("tripById('demo-kyoto').itinerary.length"), initialCount + 1);
await run(
  "TripCalendar.reschedule('demo-kyoto',calendarEventId,'2027-04-05','14:30')",
);
entry = run("tripById('demo-kyoto').itinerary.find(i=>i.id===calendarEventId)");
assert.equal(entry.date, "2027-04-05");
assert.equal(entry.time, "14:30");
assert.equal(entry.duration, 90);
assert.equal(entry.location, "12 Little Street");
await run("TripCalendar.resize('demo-kyoto',calendarEventId,120)");
assert.equal(
  run(
    "tripById('demo-kyoto').itinerary.find(i=>i.id===calendarEventId).duration",
  ),
  120,
);
await run("TripCalendar.undo('demo-kyoto')");
assert.equal(
  run(
    "tripById('demo-kyoto').itinerary.find(i=>i.id===calendarEventId).duration",
  ),
  90,
);
const backupWithCalendar = run("validateBackup(state)");
assert.ok(
  backupWithCalendar.trips
    .find((t) => t.id === "demo-kyoto")
    .itinerary.some(
      (i) => i.duration === 90 && i.website === "https://example.com",
    ),
);
const late = await run(
  "TripCalendar.schedulePlace('demo-kyoto','place-test','2027-04-04','23:45',60)",
);
context.lateEventId = late;
assert.equal(
  run("tripById('demo-kyoto').itinerary.find(i=>i.id===lateEventId).duration"),
  15,
);
await run("TripCalendar.undo('demo-kyoto')");
assert.equal(
  run("tripById('demo-kyoto').itinerary.some(i=>i.id===lateEventId)"),
  false,
);
assert.equal(
  await run(
    "TripCalendar.schedulePlace('demo-kyoto','missing','2027-04-04','10:00')",
  ),
  false,
);
assert.equal(
  await run(
    "TripCalendar.schedulePlace('demo-kyoto','place-test','2027-02-30','10:00')",
  ),
  false,
);
assert.equal(
  await run(
    "TripCalendar.schedulePlace('demo-kyoto','place-test','2027-04-04','24:00')",
  ),
  false,
);
const layout = run(
  "TripCalendar.layoutEvents([{id:'a',time:'09:00',duration:120},{id:'b',time:'09:30',duration:30},{id:'c',time:'10:00',duration:60},{id:'d',time:'11:00',duration:60}])",
);
for (let i = 0; i < layout.length; i++)
  for (let j = i + 1; j < layout.length; j++)
    if (
      layout[i].start < layout[j].start + layout[j].duration &&
      layout[j].start < layout[i].start + layout[i].duration
    )
      assert.notEqual(
        layout[i].lane,
        layout[j].lane,
        "Overlapping items must have separate lanes",
      );
assert.equal(
  layout.find((e) => e.item.id === "d").lanes,
  1,
  "Adjacent items should reuse space",
);
run("renderWorld()");
assert.match(node("#main").innerHTML, /Your trips,/);
assert.doesNotMatch(
  node("#main").innerHTML,
  /little world|piece of your heart|sleeps to go/,
);
console.log(
  "Passed: calendar scheduling, movement, resizing, undo, overlap layout, midnight bounds, backup round-trip, place metadata, plain copy, Sheets import, Story metadata, ZIP extraction.",
);
