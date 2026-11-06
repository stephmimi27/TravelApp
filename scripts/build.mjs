import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("dist/", root);

// Only dist is generated. Source files and personal browser data are untouched.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("index.html", root), new URL("index.html", output));
await cp(new URL("src/", root), new URL("src/", output), { recursive: true });
await cp(new URL("public/", root), output, { recursive: true });

const html = await readFile(new URL("index.html", output), "utf8");
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https?:|data:)/.test(match[1])) continue;
  await readFile(new URL(match[1], output));
}
console.log(`Built ${fileURLToPath(output)}`);
