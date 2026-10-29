// Lists everything that still stops this site from going to a client.
// Run `npm run check:site` (it builds first). Errors exit 1; warnings
// are things a person should look at but may be fine.
//
// The /sections and /example-components pages are reference material,
// so they are skipped.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const read = (p) => readFileSync(join(root, p), "utf8");
const errors = [];
const warnings = [];
const error = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const SKIP = ["sections", "example-components"];

// ---- Source settings -------------------------------------------------

const consts = read("src/consts.ts");
const constValue = (name) =>
  consts.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]*)"`))?.[1];

if (constValue("SITE_NAME") === "Business Name")
  error("consts.ts", "SITE_NAME is still the placeholder");
if (/example\.com/.test(constValue("SITE_URL") ?? ""))
  error("consts.ts", "SITE_URL is still example.com");
if (/A short sentence about what the business does/.test(consts))
  error("consts.ts", "SITE_DESCRIPTION is still the placeholder");
if (!/phone: "[^"]+"/.test(consts) && !/email: "[^"]+"/.test(consts))
  warn("consts.ts", "no phone or email: customers have no way to reach them");

// Lumos's own brand files, normalised for line endings.
const LUMOS_DEFAULTS = {
  "src/assets/logo/logo.svg": "149e2a8c04f9a2f0",
  "public/favicon.svg": "dfd170c148fa3fee",
  "public/favicon.ico": "158a067bd962dbf9",
  "public/og-image.jpg": "4c8f7920e0412d18",
};
const hash = (p) =>
  createHash("sha256")
    .update(
      Buffer.from(
        readFileSync(join(root, p)).toString("latin1").replace(/\r\n/g, "\n"),
        "latin1",
      ),
    )
    .digest("hex")
    .slice(0, 16);
for (const [file, lumos] of Object.entries(LUMOS_DEFAULTS)) {
  if (existsSync(join(root, file)) && hash(file) === lumos)
    error(file, "still Lumos's file; replace it with the client's");
}

// Brand colours must pass.
try {
  execFileSync(process.execPath, [join(root, "scripts/check-brand.mjs")], {
    stdio: "pipe",
  });
} catch {
  error("base.css", "brand colours fail WCAG AA; run npm run check:brand");
}

// ---- Built pages -----------------------------------------------------

if (!existsSync(dist)) {
  console.error("No dist/ folder. Run `npm run build` first.");
  process.exit(1);
}

const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "_astro") walk(full);
    } else if (name.endsWith(".html")) pages.push(full);
  }
};
walk(dist);

const routeOf = (file) =>
  "/" +
  relative(dist, file)
    .split(sep)
    .join("/")
    .replace(/(^|\/)index\.html$/, "")
    .replace(/\.html$/, "");

const textOf = (html) =>
  html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, "\u0000")
    .split("\u0000")
    .map((t) =>
      t
        .replace(/&#39;|&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

// Main content only, without the form's built-in status messages.
const mainOf = (html) =>
  (html.match(/<main\b[\s\S]*<\/main>/)?.[0] ?? "").replace(
    /<p class="form_note[\s\S]*?<\/p>/g,
    "",
  );

// Every longer line inside /sections' <main> is placeholder text. Finding
// one on a real page means it was copied and not replaced. Short labels
// ("Contact us") are fine to keep, so they are not counted.
const sectionsHtml = join(dist, "sections", "index.html");
const placeholders = existsSync(sectionsHtml)
  ? new Set(
      textOf(mainOf(readFileSync(sectionsHtml, "utf8"))).filter(
        (t) => t.length >= 22,
      ),
    )
  : new Set();
// /sections also shows the real details from consts.ts; those are not filler.
for (const t of placeholders) if (consts.includes(t)) placeholders.delete(t);

const exists = (href) => {
  const path = href.split(/[?#]/)[0].replace(/\/$/, "");
  return (
    path === "" ||
    existsSync(join(dist, path, "index.html")) ||
    existsSync(join(dist, path + ".html")) ||
    existsSync(join(dist, path))
  );
};

for (const file of pages) {
  const route = routeOf(file);
  if (SKIP.some((s) => route === `/${s}`)) continue;
  const html = readFileSync(file, "utf8");
  const text = textOf(html);
  const at = route || "/";

  const leftovers = [
    ...new Set(textOf(mainOf(html)).filter((t) => placeholders.has(t))),
  ];
  for (const t of leftovers.slice(0, 5))
    error(at, `placeholder text: "${t.slice(0, 60)}"`);
  if (leftovers.length > 5)
    error(at, `…and ${leftovers.length - 5} more placeholder lines`);

  for (const t of text.filter((t) => /\[[a-z][^\]]{2,50}\]/i.test(t)).slice(0, 5))
    warn(at, `looks like a [fill-in] left: "${t.slice(0, 70)}"`);

  for (const t of text.filter((t) => /\bTODO\b/.test(t)))
    error(at, `TODO left: "${t.slice(0, 70)}"`);
  const head = html.match(/<head>[\s\S]*<\/head>/)?.[0] ?? "";
  if (/TODO/.test(head)) error(at, "TODO in the page title or description");

  if (text.some((t) => /\bLumos\b/i.test(t)))
    error(at, 'the word "Lumos" appears on the page');

  if (/src="[^"]*\/photo\.[\w-]+\.svg"/.test(html))
    error(at, "uses the grey placeholder photo");

  for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
    if (!/\balt=/.test(img))
      error(at, `image without alt: ${img.slice(0, 80)}`);
  }

  const h1 = (html.match(/<h1\b/g) ?? []).length;
  if (h1 !== 1) error(at, `has ${h1} h1 headings; needs exactly 1`);
  let last = 0;
  for (const [, level] of html.matchAll(/<h([1-6])\b/g)) {
    const n = Number(level);
    if (last && n > last + 1) {
      error(at, `heading jumps from h${last} to h${n}`);
      break;
    }
    last = n;
  }

  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
    if (href === "" || href === "#")
      error(at, `link with an empty href`);
    else if (href.startsWith("/") && !href.startsWith("//") && !exists(href))
      error(at, `link to a page that doesn't exist: ${href}`);
  }

  for (const form of html.match(/<div[^>]*\bclass="form_wrap[^"]*"[^>]*>/g) ??
    []) {
    if (!/data-endpoint="[^"]+"/.test(form))
      error(
        at,
        "contact form has no FORM_ENDPOINT; messages would be lost",
      );
  }

  const description =
    html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  if (description.length > 160)
    warn(at, `description is ${description.length} characters; aim for 155`);
}

// ---- Report ----------------------------------------------------------

for (const w of warnings) console.log(`warn   ${w}`);
for (const e of errors) console.log(`ERROR  ${e}`);
console.log(
  `\n${pages.length} pages checked: ${errors.length} error(s), ` +
    `${warnings.length} warning(s).`,
);
process.exit(errors.length ? 1 : 0);
