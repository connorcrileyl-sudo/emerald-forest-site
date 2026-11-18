// Build emerald-helper.zip: the website helper plus the new site, ready
// for Noah to upload into public_html and extract (it makes a helper/
// folder). Run a PRODUCTION build first:
//
//   npx astro build            (no PUBLIC_REVIEW, no PREVIEW_SITE)
//   node scripts/package-helper.mjs
//
// The zip holds helper/config.php with the storehouse token and setup
// code, so send it to Noah privately and don't commit it.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const build = join(root, ".helper-build");
const out = join(root, "emerald-helper.zip");
const TAR = process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "bsdtar";

const fail = (m) => { console.error("package-helper: " + m); process.exit(1); };

if (!existsSync(join(root, "helper/config.php")))
  fail("helper/config.php is missing. Copy helper/config.sample.php and fill in the token and setup code.");
const cfg = readFileSync(join(root, "helper/config.php"), "utf8");
if (/PASTE-TOKEN|CHANGE-ME/.test(cfg)) fail("helper/config.php still has placeholder values.");

if (!existsSync(join(dist, "index.html"))) fail("no dist/. Run `npx astro build` first.");
const home = readFileSync(join(dist, "index.html"), "utf8");
if (/workers\.dev/.test(home))
  fail("dist/ looks like a PREVIEW build (it mentions workers.dev). Rebuild without PREVIEW_SITE / PUBLIC_REVIEW.");
const age = (Date.now() - statSync(join(dist, "index.html")).mtimeMs) / 3.6e6;
if (age > 12) console.warn(`warning: dist/ was built ${age.toFixed(0)} hours ago.`);

const zip = (cwd, entries, target) => {
  rmSync(target, { force: true });
  execFileSync(TAR, ["-a", "-c", "-f", target, ...entries], { cwd, stdio: "inherit" });
};

rmSync(build, { recursive: true, force: true });
const helper = join(build, "helper");
mkdirSync(helper, { recursive: true });
for (const f of ["index.php", "tools.php", "config.php", ".htaccess"]) cpSync(join(root, "helper", f), join(helper, f));

// The new site, minus Cloudflare-only files that mean nothing on Hostinger.
const skip = new Set(["_redirects", "_headers"]);
const siteEntries = readdirSync(dist).filter((n) => !skip.has(n));
zip(dist, siteEntries, join(helper, "site.zip"));

zip(build, ["helper"], out);
rmSync(build, { recursive: true, force: true });
console.log(`Wrote ${out} (${(statSync(out).size / 1e6).toFixed(1)} MB).`);
console.log("Noah: hPanel > File Manager > public_html > Upload this zip > right-click > Extract > then DELETE the zip (it holds config.php).");
console.log("Then he opens https://<domain>/helper/ and enters the setup code.");
