// Esteemed brand kit: builds the public /brand.json.
// Part of esteemed-lumos-kit; re-running install.mjs replaces this file.
//
// brand/brand.json (hand-written: business, voice, logo, recipes)
//   + colours and fonts read from the site's Lumos tokens (tokens.mjs)
//   = what /brand.json publishes, in the shape the poster creator reads.
//
// Used by src/pages/brand.json.ts at build time and by
// scripts/esteemed-brand-check.mjs (npm run brand:check).

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { brandSchema } from "./schema.mjs";
import { readColors, readFonts, DEFAULT_ROLES } from "./tokens.mjs";

export function loadBrand(root) {
	const raw = JSON.parse(readFileSync(join(root, "brand/brand.json"), "utf8"));
	const parsed = brandSchema.safeParse(raw);
	if (!parsed.success) {
		const lines = parsed.error.issues.map((i) => `  ${i.path.join(".") || "(top)"}: ${i.message}`);
		throw new Error(`brand/brand.json is not valid:\n${lines.join("\n")}`);
	}
	return parsed.data;
}

// origin: "https://site.com" when astro.config.mjs sets `site`, else "".
export function buildBrand(root, origin = "") {
	const b = loadBrand(root);
	const colors = readColors(root);
	const fonts = readFonts(root);
	const url = (path) => `${origin}/${path.replace(/^\/+/, "")}`;

	for (const v of b.logo.variants) {
		if (!existsSync(join(root, "public", v.file))) throw new Error(`Logo "${v.name}": public/${v.file} doesn't exist.`);
	}
	for (const i of b.icons?.items ?? []) {
		if (!existsSync(join(root, "public", i.file))) throw new Error(`Icon "${i.name}": public/${i.file} doesn't exist.`);
	}
	const roles = { ...DEFAULT_ROLES, ...(b.colors.roles ?? {}) };
	for (const [name, tok] of Object.entries(roles)) {
		const [scale, step] = tok.split("-");
		if (!colors[scale]?.scale?.[step]) throw new Error(`colors.roles.${name} = "${tok}" isn't a step that exists.`);
	}

	const font = (f, notes) => ({
		family: f.family,
		weights: f.weights,
		fallback: f.fallback,
		role: notes.role,
		why: notes.why,
		...(notes.source ? { source: notes.source } : {}),
		...(notes.license ? { license: notes.license } : {}),
		files: f.files.map((x) => x.name),
		urls: f.files.map((x) => url(`brand/fonts/${x.name}`)),
		readFrom: f.source,
	});

	const out = {
		version: b.version,
		updated: b.updated,
		status: b.status,
		generatedBy: "esteemed-lumos-kit: colours and fonts are read from the site's Lumos tokens (src/styles/base.css, astro.config.mjs), everything else from brand/brand.json.",
		business: b.business,
		theme: b.theme,
		voice: b.voice,
		colors: {
			why: b.colors.why,
			primary: { hex: colors.primary.hex, role: b.colors.primary.role, why: b.colors.primary.why, readFrom: colors.primary.source, scale: colors.primary.scale },
			accent: { hex: colors.accent.hex, role: b.colors.accent.role, why: b.colors.accent.why, readFrom: colors.accent.source, scale: colors.accent.scale },
			neutral: { role: b.colors.neutral.role, why: b.colors.neutral.why, readFrom: colors.neutral.source, scale: colors.neutral.scale },
			roles,
			print: b.colors.print ?? {},
		},
		fonts: { why: b.fonts.why, heading: font(fonts.heading, b.fonts.heading), body: font(fonts.body, b.fonts.body) },
		spacing: b.spacing,
		radii: b.radii,
		logo: { ...b.logo, variants: b.logo.variants.map((v) => ({ ...v, url: url(v.file) })) },
		imagery: b.imagery,
		...(b.effects ? { effects: b.effects } : {}),
		...(b.icons ? { icons: { ...b.icons, items: b.icons.items.map((i) => ({ ...i, url: url(i.file) })) } } : {}),
		creation: b.creation,
		contact: {
			...b.contact,
			googleProfileUrl: b.contact.googleProfileUrl || null,
			googlePlaceId: b.contact.googlePlaceId || null,
		},
	};
	out.summary = brandSummary(out);
	return out;
}

// Font files to serve at /brand/fonts/<name>, for the font route.
export function fontFiles(root) {
	const f = readFonts(root);
	const seen = new Map();
	for (const x of [...f.heading.files, ...f.body.files]) seen.set(x.name, x.path);
	return [...seen].map(([name, path]) => ({ name, path }));
}

const bullets = (items) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- (none)");
const known = (v, label) => (v ? `${label}: ${v}` : `${label}: not on file (ask the client)`);

// The plain-English brief an AI designer reads first. Same layout as the
// original brand layer's brandSummary, so prompts that rely on it keep
// working.
export function brandSummary(b) {
	const c = b.contact;
	const roles = Object.entries(b.colors.roles).map(([n, t]) => `${n} = ${t}`).join(", ");
	return [
		`BRAND BRIEF: ${b.business.name}${b.status === "template" ? " (PLACEHOLDER CONTENT: this brand file has not been filled in for a real client yet)" : b.status === "draft" ? " (DRAFT: some details may still be missing or marked TODO)" : ""}`,
		"",
		"About the business",
		b.business.description,
		`Audience: ${b.business.audience}`,
		`Offer: ${b.business.offer}`,
		`Why this matters: ${b.business.why}`,
		"",
		"Contact details on file (from their own website; likely right, but confirm before putting them on a poster because sites go out of date)",
		known(c.phone, "Phone"),
		known(c.email, "Email"),
		known(c.address, "Address"),
		known(c.hours, "Hours"),
		c.googleProfileUrl
			? `Google Business Profile: ${c.googleProfileUrl}`
			: "Google Business Profile: not on file (ask the client for their Google Maps link, or for their hours and address)",
		"",
		`Theme: ${b.theme.name}`,
		b.theme.why,
		"",
		`Voice (${b.voice.tone.join(", ")})`,
		b.voice.why,
		"Do:",
		bullets(b.voice.do),
		"Don't:",
		bullets(b.voice.dont),
		"Sample lines:",
		bullets(b.voice.samples),
		"",
		"Colors",
		b.colors.why,
		`Primary ${b.colors.primary.hex}: ${b.colors.primary.role} ${b.colors.primary.why}`,
		`Accent ${b.colors.accent.hex}: ${b.colors.accent.role} ${b.colors.accent.why}`,
		`Neutral: ${b.colors.neutral.role} ${b.colors.neutral.why}`,
		`Roles (token = scale-step, hex values are in colors.*.scale): ${roles}`,
		"",
		"Fonts",
		b.fonts.why,
		`Heading: ${b.fonts.heading.family} (${b.fonts.heading.weights.join(", ")}). ${b.fonts.heading.role} ${b.fonts.heading.why}`,
		`Body: ${b.fonts.body.family} (${b.fonts.body.weights.join(", ")}). ${b.fonts.body.role} ${b.fonts.body.why}`,
		"",
		"Spacing and shape",
		`${b.spacing.why} Base unit ${b.spacing.unitPx}px, section padding ${b.spacing.sectionPaddingPx}px, gutter ${b.spacing.gutterPx}px, max content width ${b.spacing.maxContentWidthPx}px.`,
		`${b.radii.why} Control ${b.radii.control}, card ${b.radii.card}, button ${b.radii.button}.`,
		"",
		"Logo",
		b.logo.why,
		`Clear space: ${b.logo.clearSpace} Minimum width: ${b.logo.minWidthPx}px. Placement: ${b.logo.placement}`,
		b.logo.variants.length ? `Variants: ${b.logo.variants.map((v) => `${v.name} (${v.useOn})`).join("; ")}` : "No logo files have been added yet.",
		"",
		"Images",
		b.imagery.why,
		"Treatment:",
		bullets(b.imagery.treatment),
		"Text over images:",
		bullets(b.imagery.textOverImages),
		"Don't:",
		bullets(b.imagery.dont),
		...(b.effects
			? ["", "Effects", b.effects.why, bullets(b.effects.items.map((e) => `${e.name} (${e.use}): ${e.plain} CSS: ${e.css}`))]
			: []),
		...(b.icons
			? [
					"",
					"Icons",
					b.icons.why,
					`From ${b.icons.source} (${b.icons.license}). Colour: ${b.icons.color}.`,
					bullets(b.icons.items.map((i) => `${i.name}: ${i.use}`)),
				]
			: []),
		"",
		"How to create things",
		b.creation.why,
		"Forms:",
		bullets(b.creation.forms),
		"Posters:",
		bullets(b.creation.posters),
		"Social posts:",
		bullets(b.creation.socialPosts),
		"Copy:",
		bullets(b.creation.copy),
	].join("\n");
}
