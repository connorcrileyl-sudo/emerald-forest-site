// Esteemed brand kit: reads a Lumos site's own colours and fonts.
// Part of esteemed-lumos-kit. Re-running the kit's install.mjs replaces
// this file, so change it in the kit repo, not in a site.
//
// Colours and fonts are never typed into brand/brand.json. They are read
// from the site itself at build time, so /brand.json always matches how
// the site really looks:
//
//   src/styles/base.css   the first `:root { ... }` block (Lumos tokens)
//   astro.config.mjs      the `fonts: [...]` list (local font files)
//
// HOW COLOURS MAP (Lumos swatch -> brand scale step)
//
//   neutral-0    --light-100      lightest surface
//   neutral-50   --light-200
//   neutral-100  --light-300      Lumos's default page background
//   neutral-200..600              blended between --light-300 and
//                                 --dark-700 in OKLab (even steps)
//   neutral-700  --dark-700
//   neutral-800  --dark-800
//   neutral-900  --dark-900       Lumos's default text / dark section
//   neutral-950  --dark-900 mixed 35% toward black
//
//   primary-500  --brand-500      the brand colour, exactly
//   primary-50..400               --brand-500 mixed toward white in OKLab
//                                 (90, 75, 55, 35, 15%)
//   primary-600..950              --brand-500 mixed toward black in OKLab
//                                 (15, 30, 45, 60, 75%)
//
//   accent-*     Lumos has no accent swatch. If base.css defines
//                --accent-500, the accent scale is derived from it the
//                same way as primary; otherwise accent = primary.
//
// Steps that are real swatches pass through unchanged; only the steps
// in between are derived. The poster creator needs every step from 50
// to 950 (plus neutral-0), which is why the in-between ones exist.
//
// HOW FONTS MAP
//
//   heading  the font behind --h1-font-family (big headlines are what
//            posters use), falling back to --heading-family
//   body     the font behind --primary-family
//
// Each var() chain is followed to a --font-* variable, which is matched
// to the `cssVariable` of an entry in astro.config.mjs `fonts:`. Only
// local fonts with literal weights and src paths can be read; that is
// how Lumos ships them. The fallback is whatever follows the --font-*
// variable inside var(), e.g. "system-ui, sans-serif".

import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

export const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

// ---- base.css ------------------------------------------------------------

export function readRootTokens(root) {
	const css = readFileSync(join(root, "src/styles/base.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
	const start = css.indexOf(":root");
	if (start === -1) throw new Error("src/styles/base.css has no :root block");
	const open = css.indexOf("{", start);
	let depth = 0;
	let end = open;
	for (; end < css.length; end++) {
		if (css[end] === "{") depth++;
		else if (css[end] === "}" && --depth === 0) break;
	}
	const tokens = {};
	for (const m of css.slice(open + 1, end).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
	return tokens;
}

// Follow var(--a, var(--b, fallback)) to a literal value.
export function resolveVar(tokens, value, seen = new Set()) {
	const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/.exec(value?.trim() ?? "");
	if (!m) return value?.trim();
	const [, name, fallback] = m;
	if (tokens[name] !== undefined && !seen.has(name)) {
		seen.add(name);
		return resolveVar(tokens, tokens[name], seen);
	}
	return fallback !== undefined ? resolveVar(tokens, fallback, seen) : undefined;
}

function hexOf(tokens, name, { required = true } = {}) {
	const v = tokens[name] === undefined ? undefined : resolveVar(tokens, tokens[name]);
	if (v && /^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
	if (v && /^#[0-9a-f]{3}$/i.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join("")}`.toLowerCase();
	if (required) throw new Error(`base.css: ${name} must be a hex colour (got ${v ?? "nothing"})`);
	return null;
}

// ---- colour maths (OKLab) ------------------------------------------------

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklab(hex) {
	const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255));
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function oklabToHex([L, A, B]) {
	const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
	const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
	const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
	const rgb = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
	return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, fromLin(c))) * 255).toString(16).padStart(2, "0")).join("")}`;
}

// t = 0 gives a, t = 1 gives b.
export function mix(a, b, t) {
	const x = hexToOklab(a);
	const y = hexToOklab(b);
	return oklabToHex(x.map((v, i) => v + (y[i] - v) * t));
}

const TINTS = { 50: 0.9, 100: 0.75, 200: 0.55, 300: 0.35, 400: 0.15 };
const SHADES = { 600: 0.15, 700: 0.3, 800: 0.45, 900: 0.6, 950: 0.75 };

function scaleFrom(base) {
	const scale = {};
	for (const step of STEPS) {
		if (step === "500") scale[step] = base;
		else if (TINTS[step] !== undefined) scale[step] = mix(base, "#ffffff", TINTS[step]);
		else scale[step] = mix(base, "#000000", SHADES[step]);
	}
	return scale;
}

export function readColors(root) {
	const t = readRootTokens(root);
	const light = ["--light-100", "--light-200", "--light-300"].map((n) => hexOf(t, n));
	const dark = ["--dark-700", "--dark-800", "--dark-900"].map((n) => hexOf(t, n));
	const brand = hexOf(t, "--brand-500");
	const accent = hexOf(t, "--accent-500", { required: false });

	const neutral = { 0: light[0], 50: light[1], 100: light[2] };
	["200", "300", "400", "500", "600"].forEach((step, i) => (neutral[step] = mix(light[2], dark[0], (i + 1) / 6)));
	Object.assign(neutral, { 700: dark[0], 800: dark[1], 900: dark[2], 950: mix(dark[2], "#000000", 0.35) });

	return {
		primary: { hex: brand, source: "--brand-500", scale: scaleFrom(brand) },
		accent: accent
			? { hex: accent, source: "--accent-500", scale: scaleFrom(accent) }
			: { hex: brand, source: "--brand-500 (the site has no --accent-500, so accent = primary)", scale: scaleFrom(brand) },
		neutral: { source: "--light-100..300 and --dark-700..900", scale: neutral },
	};
}

// What each colour is for on a poster or form. Tokens, not hex, so the
// values follow the site. Mirrors Lumos's default light/dark themes:
// light sections use --light-300 behind --dark-900 text; dark sections
// use --dark-900 behind --light-100 text; buttons are --brand-500.
// A site can override any of these in brand.json colors.roles.
export const DEFAULT_ROLES = {
	pageBackground: "neutral-100",
	card: "neutral-0",
	darkBackground: "neutral-900",
	darkPanel: "neutral-800",
	heading: "neutral-900",
	headingOnDark: "neutral-0",
	bodyText: "neutral-900",
	bodyTextOnDark: "neutral-0",
	border: "neutral-200",
	borderOnDark: "neutral-700",
	fieldBorder: "neutral-300",
	buttonFill: "primary-500",
	buttonFillHover: "primary-600",
	kicker: "primary-700",
	kickerOnDark: "primary-500",
	highlightOnDark: "accent-500",
	posterBackgroundDark: "neutral-900",
	posterTextOnDark: "neutral-0",
	posterBackgroundLight: "neutral-50",
	posterCallToAction: "primary-500",
};

// ---- fonts -----------------------------------------------------------------

export function readFontConfig(root) {
	const text = readFileSync(join(root, "astro.config.mjs"), "utf8").replace(/\/\/.*$/gm, "");
	const at = text.indexOf("fonts:");
	if (at === -1) return [];
	const body = text.slice(at);
	const vars = [...body.matchAll(/cssVariable:\s*["'](--[\w-]+)["']/g)];
	return vars.map((m, i) => {
		const from = body.lastIndexOf("name:", m.index);
		const to = i + 1 < vars.length ? body.lastIndexOf("name:", vars[i + 1].index) : body.length;
		const chunk = body.slice(from, to);
		const name = /name:\s*["']([^"']+)["']/.exec(chunk)?.[1];
		const variants = [...chunk.matchAll(/weight:\s*(\d+)([\s\S]*?)src:\s*\[\s*["']([^"']+)["']/g)]
			.map((v) => ({ weight: Number(v[1]), style: /style:\s*["'](\w+)["']/.exec(v[2])?.[1] ?? "normal", src: v[3] }))
			.filter((v) => v.style === "normal");
		return { name, cssVariable: m[1], variants };
	});
}

// Follow e.g. --h1-font-family -> var(--font-metropolis, var(--heading-family))
// to the first --font-* variable that astro.config.mjs actually declares.
function fontFor(tokens, configs, startVar) {
	const seen = new Set();
	const walk = (value) => {
		const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/.exec(value?.trim() ?? "");
		if (!m) return null;
		const [, name, fallback] = m;
		const config = configs.find((c) => c.cssVariable === name);
		if (config) return { config, fallback: fallbackText(tokens, fallback) };
		if (tokens[name] !== undefined && !seen.has(name)) {
			seen.add(name);
			const hit = walk(tokens[name]);
			if (hit) return hit;
		}
		return fallback ? walk(fallback) : null;
	};
	return walk(`var(${startVar})`);
}

function fallbackText(tokens, fallback) {
	if (!fallback) return "system-ui, sans-serif";
	const resolved = resolveVar(tokens, fallback.trim().startsWith("var(") ? fallback : `var(--x-none, ${fallback})`);
	return resolved && !resolved.startsWith("var(") ? resolved : "system-ui, sans-serif";
}

export function readFonts(root) {
	const tokens = readRootTokens(root);
	const configs = readFontConfig(root);
	const pick = (vars, label) => {
		for (const v of vars) {
			if (tokens[v] === undefined) continue;
			const hit = fontFor(tokens, configs, v);
			if (hit) return { ...hit, source: v };
		}
		throw new Error(`Couldn't find the ${label} font: none of ${vars.join(", ")} leads to a font in astro.config.mjs fonts.`);
	};
	const shape = ({ config, fallback, source }) => {
		const variants = [...config.variants].sort((a, b) => a.weight - b.weight);
		const files = variants.map((v) => {
			const path = join(root, v.src);
			if (!existsSync(path)) throw new Error(`Font file not found: ${v.src} (${config.name})`);
			if (!/\.woff2$/i.test(v.src)) throw new Error(`Font ${v.src} must be .woff2 (the poster creator loads woff2).`);
			return { path, name: basename(v.src) };
		});
		return { family: config.name, weights: variants.map((v) => v.weight), fallback, source, files };
	};
	return {
		heading: shape(pick(["--h1-font-family", "--heading-family", "--primary-family"], "heading")),
		body: shape(pick(["--primary-family"], "body")),
	};
}
