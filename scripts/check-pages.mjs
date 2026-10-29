// Opens every built page in headless Chrome at phone, tablet, laptop and
// desktop widths. Saves full-page screenshots to .site-check/ for a person
// (or an AI) to look at, and reports what a browser can catch:
//   - sideways scrolling
//   - the nav wrapping onto two rows
//   - JavaScript errors
//   - axe-core accessibility violations (WCAG 2.2 AA + best practice)
//
// Run `npm run check:pages` (builds, serves dist/ on port 4399, then
// checks). Set CHROME_PATH if Chrome is somewhere unusual.
import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, relative, sep } from "node:path";
import { createRequire } from "node:module";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const dist = join(root, "dist");
const out = join(root, ".site-check");
const WIDTHS = [375, 768, 1024, 1440];
const SKIP = ["/sections", "/example-components"];
const PORT = 4399;

const chrome =
  process.env.CHROME_PATH ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
if (!chrome) {
  console.error("Chrome not found. Set CHROME_PATH.");
  process.exit(1);
}
if (!existsSync(dist)) {
  console.error("No dist/ folder. Run `npm run build` first.");
  process.exit(1);
}

const axeSource = readFileSync(
  createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  "utf8",
);

// ---- Static server for dist/ -----------------------------------------

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split("?")[0]);
  const file = [join(dist, path), join(dist, path, "index.html"), join(dist, path + ".html")].find(
    (f) => existsSync(f) && statSync(f).isFile(),
  );
  if (!file) {
    res.writeHead(404, { "content-type": "text/html" });
    res.end(readFileSync(join(dist, "404.html")));
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));
const base = `http://localhost:${PORT}`;

// ---- Routes ----------------------------------------------------------

const routes = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "_astro") walk(full);
    } else if (name.endsWith(".html")) {
      const route =
        "/" +
        relative(dist, full)
          .split(sep)
          .join("/")
          .replace(/(^|\/)index\.html$/, "")
          .replace(/\.html$/, "");
      if (!SKIP.includes(route)) routes.push(route);
    }
  }
};
walk(dist);
routes.sort();

// ---- Checks ----------------------------------------------------------

mkdirSync(out, { recursive: true });
const problems = [];
const shots = [];

// A fresh browser per page and width: slower, but a closed or crashed
// tab (some blockers kill Chrome windows) only costs a retry.
async function visit(route, width, withAxe) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let browser;
    try {
      browser = await puppeteer.launch({ executablePath: chrome, headless: true });
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e.message ?? e)));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      // Screenshots must show the end state, not a frame mid-transition.
      await page.evaluateOnNewDocument(() =>
        document.addEventListener("DOMContentLoaded", () => {
          const s = document.createElement("style");
          s.textContent = "*,*::before,*::after{transition:none!important;animation-play-state:paused!important}";
          document.head.append(s);
        }),
      );
      await page.setViewport({ width, height: 900 });
      await page.goto(base + route, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 500));

      const layout = await page.evaluate(() => {
        const nav = document.querySelector(".nav_wrap");
        const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height")) * 16;
        return {
          sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          navWraps: nav ? nav.offsetHeight > bar + 4 : false,
        };
      });
      if (layout.sideways) problems.push(`${route} @${width}: page scrolls sideways`);
      if (layout.navWraps) problems.push(`${route} @${width}: nav wraps onto two rows`);
      for (const e of errors) problems.push(`${route} @${width}: JS error: ${e}`);

      if (withAxe) {
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate(() =>
          window.axe.run(document, {
            runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"],
          }),
        );
        for (const v of result.violations) {
          const where = v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ");
          problems.push(`${route}: [${v.impact}] ${v.help} (${v.nodes.length}) at ${where}`);
        }
      }

      const name = (route === "/" ? "home" : route.slice(1).replace(/\//g, "_")) + `_${width}.png`;
      await page.screenshot({ path: join(out, name), fullPage: true });
      shots.push(name);
      return;
    } catch (e) {
      if (attempt === 4) problems.push(`${route} @${width}: could not load (${e.message})`);
    } finally {
      await browser?.close().catch(() => {});
    }
  }
}

for (const route of routes) {
  for (const width of WIDTHS) {
    await visit(route, width, width === 1440);
  }
  console.log(`checked ${route}`);
}
server.close();

// ---- Report ----------------------------------------------------------

console.log(`\nScreenshots: ${relative(root, out)}${sep} (${shots.length} files)`);
for (const p of problems) console.log(`ERROR  ${p}`);
console.log(`\n${routes.length} pages × ${WIDTHS.length} widths: ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
