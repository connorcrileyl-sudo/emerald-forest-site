# Brand file

`brand/brand.json` is this client's style guide for posters, social
posts and forms. It's published at `/brand.json`, where the poster
creator and the analytics dashboard read it.

This README comes from the Esteemed Lumos kit and is replaced when the
kit is updated. `brand.json` itself belongs to the site and is never
replaced.

## What goes in it, and what doesn't

Write in it what CSS can't say: the business, the voice, logo rules,
how to treat the client's photos, how to build posters, and contact
details.

Don't put colours or fonts in it. Those are read from the site when it
builds:

- colours from `src/styles/base.css` (`--light-*`, `--dark-*`,
  `--brand-500`, and `--accent-500` if the site has one)
- fonts from `astro.config.mjs` (`fonts:`), via `--h1-font-family` for
  headings and `--primary-family` for body text

So changing the site's look changes the brand file too, with nothing
to keep in sync. `src/esteemed/brand/tokens.mjs` explains exactly how
the swatches become the 50 to 950 scales posters use.

## Filling it in

1. Replace every `TODO` with real text from the site or the client.
   If you don't know something, leave it out or empty; never guess.
   The AI designer treats this file as fact.
2. Every `why` is required and needs a real sentence. The reasons are
   what let the AI make good calls in cases nobody planned for.
3. Logos: put the files in `public/` and list them under
   `logo.variants`, with `file` as the path inside `public/`. Name a
   version for dark backgrounds with "dark" in its name or `useOn`.
4. `contact`: copy from the site. Empty string when unknown.
5. Set `status`: `template` (not filled in), `draft` (filled in, some
   TODOs left), `final` (checked with the client).
6. Run `npm run brand:check`. It fails on a missing `why`, a missing
   logo file or a font it can't read, and prints the colours and fonts
   it found.
