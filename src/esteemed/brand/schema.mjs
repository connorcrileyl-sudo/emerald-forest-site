// Esteemed brand kit: the shape of brand/brand.json.
// Part of esteemed-lumos-kit; re-running install.mjs replaces this file.
//
// brand/brand.json holds only what CSS can't say: the business, voice,
// logo rules, how to treat photos, how to build posters, contact details.
// Colours and fonts are NOT in it; they are read from the site's Lumos
// tokens (see tokens.mjs) and added when /brand.json is built.
//
// Design rule, kept from the original brand layer: every section has a
// required `why`. The file is read by people and by AI (the poster
// creator, n8n), and a value with no reason can't be applied sensibly to
// a case nobody planned for. The reasons are what an AI generalises from.

import { z } from "astro/zod";

const why = z.string().min(30, "Write the reason in a full sentence or two (30+ characters).");
const token = z.string().regex(/^(primary|accent|neutral)-(0|50|[1-9]00|950)$/, 'Use a token like "primary-500" or "neutral-0".');

const fontNotes = z.object({
	role: z.string(),
	why,
	source: z.string().optional(),
	license: z.string().optional(),
});

export const brandSchema = z.object({
	version: z.number().int(),
	updated: z.string(),
	status: z.enum(["template", "draft", "final"]),

	business: z.object({
		name: z.string(),
		industry: z.string(),
		description: z.string(),
		audience: z.string(),
		offer: z.string(),
		why,
	}),

	theme: z.object({ name: z.string(), why }),

	voice: z.object({
		tone: z.array(z.string()).min(1),
		why,
		do: z.array(z.string()),
		dont: z.array(z.string()),
		samples: z.array(z.string()),
	}),

	// The reasons behind the colours. The values themselves come from
	// base.css. `roles` optionally overrides the kit's default roles.
	colors: z.object({
		why,
		primary: z.object({ role: z.string(), why }),
		accent: z.object({ role: z.string(), why }),
		neutral: z.object({ role: z.string(), why }),
		roles: z.record(z.string(), token).optional(),
		print: z.record(z.string(), z.object({ cmyk: z.string().optional(), pantone: z.string().optional() })).optional(),
	}),

	// The reasons behind the fonts. Families, weights and files come from
	// astro.config.mjs.
	fonts: z.object({ why, heading: fontNotes, body: fontNotes }),

	spacing: z.object({
		why,
		unitPx: z.number(),
		sectionPaddingPx: z.number(),
		gutterPx: z.number(),
		maxContentWidthPx: z.number(),
	}),

	radii: z.object({ why, control: z.string(), card: z.string(), button: z.string() }),

	// `file` is a path inside public/, e.g. "logo.png" or "logo/mark.svg".
	logo: z.object({
		why,
		variants: z.array(z.object({ name: z.string(), file: z.string(), useOn: z.string() })),
		clearSpace: z.string(),
		minWidthPx: z.number(),
		placement: z.string(),
	}),

	imagery: z.object({
		why,
		expectSuppliedImages: z.boolean(),
		treatment: z.array(z.string()),
		textOverImages: z.array(z.string()),
		dont: z.array(z.string()),
	}),

	creation: z.object({
		why,
		forms: z.array(z.string()),
		posters: z.array(z.string()),
		socialPosts: z.array(z.string()),
		copy: z.array(z.string()),
	}),

	// Optional named visual treatments (gradients, shadows, textures)
	// the site uses, as CSS plus a plain description for non-CSS tools.
	effects: z
		.object({
			why,
			items: z.array(z.object({ name: z.string(), use: z.string(), css: z.string(), plain: z.string() })),
		})
		.optional(),

	// Optional icon set for posts and posters. Files live in public/
	// (`file` is the path inside it). Only icons the licence lets you
	// publish: Font Awesome Free (CC BY 4.0) yes, Font Awesome Pro no.
	icons: z
		.object({
			why,
			source: z.string(),
			license: z.string(),
			color: z.string(),
			items: z.array(z.object({ name: z.string(), file: z.string(), use: z.string() })),
		})
		.optional(),

	// Facts the poster creator may put on a poster. It treats them as
	// likely-right and confirms with the client first. Empty string when
	// unknown, never a guess.
	contact: z.object({
		phone: z.string(),
		email: z.string(),
		address: z.string(),
		hours: z.string(),
		tagline: z.string(),
		googleProfileUrl: z.string(),
		googlePlaceId: z.string(),
		socials: z.array(z.object({ name: z.string(), url: z.string() })),
	}),
});
