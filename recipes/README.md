# Section recipes

Ready-made page sections built only from Lumos components. Every
recipe lives in one file, rendered live:

- **Code:** `src/pages/sections.astro`
- **Preview:** `/sections` on the dev server (hidden from search)

Each recipe sits between two comments:

```astro
<!-- recipe: hero-split -->
...the section...
<!-- /recipe -->
```

## Using a recipe

1. Copy everything between the markers into the page.
2. Copy the imports it needs from the top of `sections.astro`.
3. Replace every word of placeholder text with the client's real
   content. Placeholder text describes what belongs there ("Say what
   you do and who it is for"), so none of it should survive.
4. Replace `photo` (the grey placeholder) with the client's images
   (see Images below).

Do not wrap a recipe in a new component to reuse it. Lumos keeps
sections in the page so Stacki can edit each one on its own; see
`LUMOS.md`. Copy it again instead.

## The recipes

| Recipe | Use it for | Notes |
| --- | --- | --- |
| `hero-split` | Home page top: text left, photo right | Default hero |
| `hero-centered` | Top of a page with no good photo | Uses the `display` size |
| `hero-image` | Top of a page with one strong photo | Text over the photo, dark overlay; `strength` sets how dark |
| `services-grid` | List of services as cards with links | Cards wrap on their own; add or remove freely |
| `services-images` | Services where each has a photo | Three across from 768px |
| `features` | "Why choose us": 3–4 short reasons | Swap the check icon only for one from the same set |
| `about-split` | Short story with a photo | `reverse` puts the photo on the left |
| `team` | Staff with photos | Four across on desktop, two on tablet |
| `testimonials-grid` | Up to three reviews | Dark section |
| `testimonials-slider` | Four or more reviews | Slider with dots and arrows |
| `pricing` | Two to four packages | `featured` highlights one in the brand colour |
| `faq` | Questions and answers | One open at a time (`single`) |
| `cta-band` | Ending a page with one action | Brand-colour band; use once per page at most |
| `contact` | Contact page: details and a form | Reads phone/email/address/hours from `src/consts.ts` |
| `logo-strip` | Partners, certifications, brands | Scrolls; swap names for logos when the client has them |
| `gallery` | Photos of past work | Two across on phones, three on desktop |

Two custom pieces back the reviews and pricing recipes, both in
`src/components/content/`: `QuoteCard` (a review with proper quote
markup) and `PriceCard` (a package with a feature list).

## Rules for building pages

**Headings.** One `h1` per page, in the first section; every hero
recipe uses `tag="h1"`. Every other section heading is `h2`, and
headings inside a section's cards or items are `h3`. Never skip a
level. Change the `variant` if a heading needs to look bigger or
smaller; never change `tag` for looks.

**Facts.** Never invent business facts: prices, reviews, years in
business, licences, staff names, guarantees. Use what the client gave.
If something is missing, leave a visible `TODO:` in its place and list
it in the report. Reviews must be real and used with permission.

**Contact details** come from `src/consts.ts`, never typed into a page.
The `contact` recipe already reads them.

**Forms.** `FORM_ENDPOINT` in `src/consts.ts` must be set before a site
with a form goes live. While it is empty, Lumos's form still shows
"sent" but delivers nothing. Any endpoint that accepts a normal form
POST and answers with a 2xx works; a Formspree form URL is the
simplest. Send a test message before handoff.

**Images.** Put the client's photos in `src/assets/images/` and import
them:

```astro
import kitchen from "@/assets/images/kitchen-refit.jpg";
<Img src={kitchen} alt="New kitchen sink and taps fitted under a window" />
```

Astro resizes and converts them at build time. Write `alt` text that
says what the photo shows; leave `alt` off only for purely decorative
images (like the background of `hero-image`). Give the first image on
a page `loading="eager" fetchPriority="high"`, as the hero recipes do;
leave the rest lazy.

**Rhythm.** Alternate section backgrounds so the page doesn't read as
one block: most sections inherit the page theme, add one `theme="dark"`
section (reviews work well) and at most one `theme="brand"` section
(the `cta-band`). Never put two dark or two brand sections next to
each other.

**Links.** Every button and link must point at a page that exists. Use
the routes in `NAV_LINKS`.

**New styles.** If a recipe can't do what a page needs, first look for
a component `variant` or prop. New CSS is the last resort and must pass
the checklists in `LUMOS.md`.
