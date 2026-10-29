# Lumos client-site starter

A starter for small-business websites, built on
[Lumos for Astro](https://lumosframework.com) 1.0.1. Duplicate it per
client ("Use this template" on GitHub), then have an AI build the site
from a short brief and polish it visually in
[Stacki](https://stacki.build).

Astro only, plain CSS and custom properties. No React, Vue, Svelte or
Tailwind.

## Start a client site

1. On GitHub, **Use this template** → new private repo for the client.
2. Clone it, then:

   ```sh
   npm install
   npm run dev
   ```

3. In Claude Code, in the new repo:

   > Build a site for Riverside Plumbing in Springfield. Services:
   > repairs, boilers, bathrooms. Phone (555) 123-4567. Brand colour
   > #1d4ed8.

   That runs the `build-client-site` skill
   (`.agents/skills/build-client-site/`): details, brand, pages, checks,
   then a report of what the client still needs to send.

4. Open the folder in Stacki to adjust layout and text by clicking.

## What's where

| File | What it holds |
| --- | --- |
| `src/consts.ts` | Every client fact: name, contact, hours, nav, social links, form endpoint |
| `src/styles/base.css` | Brand colours and design tokens (top of `:root`) |
| `astro.config.mjs` | The font |
| `src/assets/logo/` | Logo |
| `src/pages/` | Pages: Home, About, Services, Contact, 404 |
| `src/pages/sections.astro` | All section recipes, live at `/sections` |
| `recipes/README.md` | How to use the recipes, and the rules for pages |
| `recipes/PAGES.md` | Which pages and sections suit which business |
| `docs/BRANDING.md` | Rebranding step by step |
| `src/components/content/` | `QuoteCard`, `PriceCard`: the two custom blocks |
| `PLAN.md` | How the starter was built, and the Lumos files it changed |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Builds to `dist/` |
| `npm run check` | Type-checks every `.astro` file |
| `npm run check:brand` | Brand colours against WCAG AA, every theme |
| `npm run check:site` | Placeholder text, TODOs, Lumos leftovers, broken links, headings, alt text, form endpoint |
| `npm run check:pages` | Every page at 375/768/1024/1440 in headless Chrome: screenshots to `.site-check/`, sideways scroll, nav wrapping, JS errors, axe accessibility |
| `npm run format` | Prettier |

`check:pages` needs Google Chrome installed (set `CHROME_PATH` if it
isn't found).

## Before handing a site over

All three checks pass, the client has confirmed every fact on the site,
`FORM_ENDPOINT` is set and a test message arrived, and someone has
looked at the `.site-check/` screenshots.

## Upgrading Lumos

Use the `lumos-upgrade-version` skill. This starter changed some Lumos
library files (listed in `PLAN.md`); check those survived the merge,
then run the three checks.

## Licence

MIT, as Lumos. See `LICENSE`.
