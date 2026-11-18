# Site Editor guide (read by Claude)

You are editing the source of emeraldforestfurnishings.com, an Astro
site built with Lumos (plain CSS + custom properties, Astro components
only: no React/Vue/Tailwind). Every change you write is a commit on
the `draft` branch. GitHub then builds a private preview (about two
minutes). Noah checks it and presses Publish; only then does it go
to `main` and become the zip he uploads to Hostinger.

## Where things are

| What | File |
| --- | --- |
| Business facts: phone, email, towns, nav, footer, service list, socials, form key | `src/consts.ts` |
| Pages (one file = one URL; `custom-doors.astro` -> `/custom-doors/`) | `src/pages/*.astro` |
| Photos (imported at the top of a page) | `src/assets/images/` |
| Section recipes (copy from here to build new sections) | `src/pages/sections.astro` |
| Components | `src/components/<group>/*.astro` |
| Colours, fonts, spacing (design tokens) | `src/styles/base.css` |
| Site-wide CSS patterns | `src/styles/patterns.css`, `global.css` |
| Page shell (head, nav, footer) | `src/layouts/BaseLayout.astro` |
| FAQ helper and the town list | `src/utils/faq.ts` |

Service pages (`custom-*.astro`, `pergolas.astro`, `stair-railings.astro`,
`finish-carpentry.astro`) all follow one pattern: imports, a
`description`, a `faqs` list, then `<Layout>` with `<ServiceSchema>`,
`<Breadcrumbs>`, a hero with a photo, sections, an FAQ accordion and
`<RelatedServices>`. Read one before changing another.

## How to make common changes

- **Wording:** edit the text in the page. Facts used site-wide
  (phone, email, towns) live in `src/consts.ts`: change them there
  once, not in each page.
- **New page:** copy the closest existing page (a new service: copy
  a service page), give it a new file name in kebab-case, rewrite
  every piece of text for the new topic, then add it to
  `SERVICE_LINKS` (and `NAV_LINKS` children for services) in
  `src/consts.ts` so it appears in the menu, footer and related
  services. Use real photos only; if Noah has none yet, reuse a
  fitting existing one and tell him.
- **Remove a page:** delete the file, take it out of `src/consts.ts`,
  and search for links to it (`href="/its-path/"`) and remove them.
  Tell Noah that Connor should add a redirect for the old address.
- **Photo:** a photo Noah sends is saved to `src/assets/images/` with
  a descriptive kebab-case name. Import it at the top of the page
  (`import name from "@/assets/images/file.jpg";`) and use
  `<Img src={name} alt="what is in the photo" />`. Write a real alt
  text describing the woodwork.
- **New section:** copy a recipe from `src/pages/sections.astro`
  (between `<!-- recipe: x -->` and `<!-- /recipe -->`) with the imports
  it needs. Don't invent new components or one-off CSS when a recipe
  or component already does it.
- **Design (colour, font size, spacing):** change the token in
  `src/styles/base.css` only when Noah wants it everywhere; for one
  place, use the component's own props (read the component first).
  Keep the emerald and gold brand look and good contrast.

## Rules

- Read a file before you change it, and write the whole file back.
  Change only what was asked; keep everything else exactly as it is.
- Never invent business facts (prices, years, reviews, licences,
  warranties, staff). Use only what Noah tells you.
- Copy tone: plain, warm, first person "we", minimal. "food-safe,
  eco-friendly finishes"; mention zero-VOC only where it already is.
  Noah doesn't do plumbing or electrical work.
- Don't touch: `package.json`, `astro.config.mjs`, `.github/`,
  `helper/`, `scripts/`, `public/.htaccess`, the form settings in
  `src/consts.ts` (`FORM_ENDPOINT`, `WEB3FORMS_KEY`), analytics IDs,
  and the legal pages' substance (`privacy-policy`, `terms`).
  For those, tell him to ask Connor.
- After a change, check the build result. If it failed, read the
  error, fix it, and only then tell Noah the preview is ready.
