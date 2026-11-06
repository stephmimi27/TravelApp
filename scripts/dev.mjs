import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const option = (name) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const port = Number(option("--port") || process.env.PORT || 3000);
const host =
  option("--host") ||
  process.env.HOST ||
  (process.env.SITES_MANAGED_LINUX_CONTAINER === "1" ? "0.0.0.0" : "127.0.0.1");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405);
      response.end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    let directory, relative;
    if (pathname === "/" || pathname === "/index.html") {
      directory = root;
      relative = "index.html";
    } else if (pathname.startsWith("/src/")) {
      directory = path.join(root, "src");
      relative = pathname.slice(5);
    } else if (pathname.startsWith("/assets/")) {
      directory = path.join(root, "public/assets");
      relative = pathname.slice(8);
    } else {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    const file = path.resolve(directory, relative);
    if (!file.startsWith(directory + path.sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": `${types[path.extname(file)] || "application/octet-stream"}; charset=utf-8`,
      "Cache-Control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, host, () =>
  console.log(`TravelApp running at http://${host}:${port}`),
);
