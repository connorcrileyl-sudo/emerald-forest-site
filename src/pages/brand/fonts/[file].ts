// Esteemed brand kit: serves the site's font files at stable addresses,
// /brand/fonts/<file>.woff2, so the poster creator can load the exact
// fonts the site uses. (Astro's own font URLs carry a content hash and
// change on every font edit.)
// Part of esteemed-lumos-kit; re-running install.mjs replaces this file.

import type { APIRoute } from "astro";
import { readFileSync } from "node:fs";
import { fontFiles } from "../../../esteemed/brand/build.mjs";

export const prerender = true;

export function getStaticPaths() {
	return fontFiles(process.cwd()).map((f) => ({ params: { file: f.name }, props: { path: f.path } }));
}

export const GET: APIRoute = ({ props }) =>
	new Response(readFileSync(props.path as string), {
		headers: { "Content-Type": "font/woff2" },
	});
