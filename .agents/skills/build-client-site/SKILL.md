---
name: build-client-site
description: Build a complete small-business website for a client from this starter — details, branding, pages and copy — then check it and report what is still missing. Use when the user asks to build, set up or start a site for a business ("build a site for Joe's Plumbing"), gives a client brief, or asks to turn this template into a real client site.
---

# Building a client site

The starter already has the parts: client details in one file, a
branding guide, sixteen tested section recipes, page sets by business
type, and two checkers. This skill is the order to use them in.

**The rule that outranks the rest: never invent a business fact.**
Prices, reviews, years in business, licences, staff, guarantees, hours,
service areas, awards: use only what the user or client gave. Where
something is missing, write `TODO: <what is needed>` in its place and
list it in the report. A visible TODO is a question for the client; an
invented fact is a lie on their website. Write the copy (headlines,
descriptions, calls to action) freely, in their voice, but built only on
facts they supplied.

Read these before starting; they hold the detail this file points at:

- `recipes/README.md` — the section recipes and the rules for pages.
- `recipes/PAGES.md` — which pages and sections suit which business.
- `docs/BRANDING.md` — colours, font, logo, favicon, social image.
- `LUMOS.md` — before writing any new CSS or component.

## 1. The brief

Collect what you can from the conversation and any files given. Ask
once, in one message, for anything essential that is missing. Do not
stall on optional items; mark them TODO and go on.

| Need | Essential? |
| --- | --- |
| Business name, what they do, where | Yes |
| Business type (sets the page set and main action) | Yes |
| Services, with a line on each | Yes |
| Phone and/or email | Yes |
| Brand colour, or a logo to take it from | Yes |
| Logo file (SVG best) | No — text name until supplied |
| Address, hours | Depends on type (hospitality: yes) |
| Reviews, team, prices, photos | No — leave those sections out or TODO |
| Tone ("friendly local", "formal") | No — infer from type |
| Domain | No — TODO in `SITE_URL` |
| Form destination (Formspree URL) | No — TODO; site cannot launch without it |

## 2. Client details — `src/consts.ts`

Fill `SITE_NAME`, `SITE_DESCRIPTION` (one sentence, under 155
characters), `SITE_URL`, `BUSINESS`, `NAV_LINKS`, `NAV_CTA`,
`SOCIAL_LINKS`, `FORM_ENDPOINT`. Pick `NAV_CTA` from the "Main action"
table in `recipes/PAGES.md`. Leave unknown values `""`; empty fields are
hidden on the site, and the checker reports the important ones.

## 3. Brand — `docs/BRANDING.md`

1. Set the swatches in `src/styles/base.css` and run
   `npm run check:brand` until every pair passes.
2. Set the font in `astro.config.mjs` if the client has one; otherwise
   keep Inter or pick one free Google font that suits the tone.
3. Replace `src/assets/logo/logo.svg` (and `logo-icon.svg`) and set
   `--logo-width-nav`/`--logo-width-footer`. With no logo yet, leave
   Lumos's file and note it; the checker will flag it.
4. Favicon and `og-image.jpg` in `public/`: make them from the logo if
   you can, otherwise list them as TODO.

## 4. Pages

1. Pick the page set for the business type in `recipes/PAGES.md`.
2. Edit the starter pages (`index`, `about`, `services`, `contact`) and
   add any others the set calls for, copying sections from
   `src/pages/sections.astro`.
3. Replace every word of placeholder text. Drop a section rather than
   fill it with something vague (no reviews → no reviews section).
4. Images: the client's photos go in `src/assets/images/` with real
   alt text. Without photos, use the layouts that don't need them
   (`hero-centered`, `services-grid`) instead of leaving grey
   placeholders.
5. Give every page a `title` and a search `description`.

Do not add new CSS or components unless a recipe cannot do the job,
and then follow `LUMOS.md`'s checklists.

## 5. Clean up the starter

- Remove links to `/sections` and `/example-components` if any were
  added. Keep both files; they stay out of search via `NOINDEX_ROUTES`.
- Delete `src/assets/fonts/inter-regular.woff2` if the font changed.

## 6. Check

Run all three and fix what they report, then run them again:

```
npm run check:brand    # colour contrast
npm run check:site     # placeholders, TODOs, Lumos leftovers, links,
                       # headings, alt text, form endpoint
npm run check:pages    # every page at 375/768/1024/1440: sideways
                       # scroll, nav wrapping, JS errors, axe a11y
```

`check:site` failing **only** on TODOs and on files the client hasn't
supplied yet is expected at this stage; everything else must pass.

Then look at the screenshots in `.site-check/` — at least the home page
at 375 and 1440, and every page at one width. Check by eye what the
scripts can't: the logo's size and crispness, text that wraps badly,
a section that looks empty, two neighbouring sections in the same
colour, photos cropped through a face.

## 7. Report

End with a short report for the user:

1. **Built:** the pages, and what is on each.
2. **Needs the client:** every TODO, grouped (facts, files, accounts),
   in plain words they can forward to the client.
3. **Check by eye:** anything you were unsure about.
4. **Checks:** the result of each command, and what still fails.

Commit only if the user asks. Never deploy.
