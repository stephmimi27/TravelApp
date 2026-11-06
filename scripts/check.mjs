import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
async function checkDirectory(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? "/" : ""), path);
    if (entry.isDirectory()) await checkDirectory(file);
    else if (/\.m?js$/.test(entry.name)) {
      const result = spawnSync(
        process.execPath,
        ["--check", fileURLToPath(file)],
        { stdio: "inherit" },
      );
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}
for (const folder of ["src/", "scripts/", "tests/"])
  await checkDirectory(new URL(folder, root));
const html = await readFile(new URL("index.html", root), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(
  (match) => match[1],
);
assert.equal(
  new Set(scripts).size,
  scripts.length,
  "Each source script must be loaded once",
);
assert.equal(
  scripts.at(-1),
  "src/main.js",
  "Start the app after its feature files",
);
for (const script of scripts) await readFile(new URL(script, root));
console.log("Passed: source syntax and application entry points.");
