# Lumos for Astro

This is **Lumos for Astro**, an Astro component framework styled with plain CSS
and custom properties. Do not apply conventions from **Lumos for Webflow**.
Project conventions live in `LUMOS.md` and `.agents/skills/`.

## This starter

A client-site starter built on Lumos. To build a site for a business,
use the `build-client-site` skill. The pieces it uses:

- `src/consts.ts` — every client fact (name, contact, nav, form endpoint).
- `docs/BRANDING.md` — colours, font, logo; `npm run check:brand`.
- `recipes/README.md` — section recipes, live at `/sections`
  (`src/pages/sections.astro`), and the rules for building pages.
- `recipes/PAGES.md` — page sets by business type.
- `npm run check:site` and `npm run check:pages` — pre-handoff checks.
- `PLAN.md` — how the starter was built, and which Lumos library files
  it changed (check those after every Lumos upgrade).

Never invent business facts (prices, reviews, licences, staff, years):
use what the client gave, and leave `TODO:` for the rest.

Astro only: no React, Vue, Svelte or other UI framework integrations.

## Development

Start the dev server in background mode:

```
astro dev --background
```

Use `astro dev stop`, `astro dev status`, and `astro dev logs` to manage it.

## Astro documentation

Use the relevant [Astro documentation](https://docs.astro.build) before working
on these areas:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Building

Read [LUMOS.md](LUMOS.md) before adding pages, components, or styles.

## Skills

Task-specific procedures live in `.agents/skills/<name>/SKILL.md`, alongside
any scripts they need.

- `lumos-import-figma` — build pages or variables from a Figma file.
- `lumos-audit-props` — check prop order and tooltip consistency.
- `lumos-scaling-graphic` — build an editable graphic that scales as one piece.
- `lumos-import-webflow` — migrate a Webflow export and connect its CMS.
- `lumos-upgrade-version` — upgrade Lumos without losing customizations.
- `build-client-site` — build a full client site from a brief (this starter).

`.agents/skills/` is the source of truth. Claude Code loads the same skills from
relative symlinks in `.claude/skills/`. For each new skill, add
`.claude/skills/<name>` pointing to `../../.agents/skills/<name>`.

- Codex: use `$lumos-import-figma` or ask for the skill by name. Restart Codex
  if a new skill does not appear.
- Claude Code: use `/lumos-import-figma` or let it load the skill when relevant.
- Other assistants: read `SKILL.md` directly. Instructions are Markdown and
  scripts are Node.
