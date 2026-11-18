// Esteemed brand kit: publishes the brand at /brand.json.
// Part of esteemed-lumos-kit; re-running install.mjs replaces this file.
//
// Read by the poster / social-post creator (via n8n or the browser) and
// by the client analytics dashboard (for the logo). brand/brand.json
// itself is not shipped; this is the deliberate public view of it, with
// colours and fonts read from the site's own Lumos tokens.
//
// URLs are absolute when `site` is set in astro.config.mjs (it should
// be, per client), otherwise root-relative.

import type { APIRoute } from "astro";
import { buildBrand } from "../esteemed/brand/build.mjs";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
	const body = buildBrand(process.cwd(), site ? site.origin : "");
	return new Response(JSON.stringify(body, null, 2), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
};
