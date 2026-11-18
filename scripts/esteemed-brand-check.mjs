// Esteemed brand kit: checks brand/brand.json and what /brand.json will
// publish. Run with `npm run brand:check` from the site folder.
// Part of esteemed-lumos-kit; re-running install.mjs replaces this file.
//
// Fails (exit 1) if brand.json breaks the schema (every section needs a
// real `why`), a logo file is missing from public/, a colour role points
// at a step that doesn't exist, or the fonts can't be read from
// astro.config.mjs. Otherwise prints what it read from the site.

import { buildBrand } from "../src/esteemed/brand/build.mjs";

try {
	const b = buildBrand(process.cwd());
	const scale = (s) => Object.entries(s).map(([k, v]) => `${k} ${v}`).join("  ");
	console.log(`brand.json OK: ${b.business.name} (status: ${b.status})\n`);
	console.log("Colours read from src/styles/base.css");
	console.log(`  primary  ${b.colors.primary.hex}  from ${b.colors.primary.readFrom}`);
	console.log(`           ${scale(b.colors.primary.scale)}`);
	console.log(`  accent   ${b.colors.accent.hex}  from ${b.colors.accent.readFrom}`);
	console.log(`  neutral  ${scale(b.colors.neutral.scale)}`);
	console.log("\nFonts read from astro.config.mjs");
	for (const k of ["heading", "body"]) {
		const f = b.fonts[k];
		console.log(`  ${k.padEnd(8)} ${f.family} ${f.weights.join("/")}  (via ${f.readFrom}; fallback ${f.fallback})`);
	}
	console.log(`\nLogos: ${b.logo.variants.map((v) => v.file).join(", ") || "none yet"}`);
	const todo = JSON.stringify(b).match(/TODO/g)?.length ?? 0;
	if (b.status === "template") console.log("\nNote: status is \"template\"; fill brand/brand.json in for this client.");
	if (todo) console.log(`\nNote: ${todo} TODO marker(s) left in brand/brand.json.`);
} catch (err) {
	console.error(err.message);
	process.exit(1);
}
