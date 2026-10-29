# Page recipes

Which pages a site gets, and which section recipes go on each, by type
of business. Sections are the recipes in `recipes/README.md`. These are
starting points: drop a section the client has no content for rather
than filling it with filler.

The starter already has Home, About, Services and Contact pages built
from the "Default" set below, with placeholder text. Edit those rather
than starting new files.

## How to add a page

1. Create `src/pages/<route>.astro`. Copy the frontmatter and `<Layout>`
   from `src/pages/about.astro`, keep only the imports you use.
2. Give the `<Layout>` a `title` (the site name is appended) and a
   `description`: one sentence, under about 155 characters, written
   for search results.
3. Build it from section recipes. The first section has the page's only
   `h1`.
4. Add it to `NAV_LINKS` in `src/consts.ts` if it belongs in the menu.
   About five links fit in one row at 1024px; past that, put secondary
   pages in `FOOTER_LINKS` only.

## Main action by business type

Every page ends with one clear action, used the same way everywhere:
the nav button (`NAV_CTA`), the hero's main button and the `cta-band`.

| Business | Main action | `NAV_CTA` |
| --- | --- | --- |
| Trades, emergency work | Phone call | `{ label: "Call now", href: PHONE_HREF }` |
| Services sold by quote | Quote form | `{ label: "Get a quote", href: "/contact" }` |
| Appointments (salon, clinic) | Booking | `{ label: "Book now", href: "<booking link>" }` |
| Café, restaurant, shop | Visit | `{ label: "Find us", href: "/contact" }` |
| Professional services | Consultation | `{ label: "Book a call", href: "/contact" }` |

Use the client's real booking link when they have one (Square, Fresha,
Calendly…). Do not embed a booking widget; link to it.

## Default small business

| Page | Sections, in order |
| --- | --- |
| Home `/` | hero-split, services-grid, features, testimonials-grid, cta-band |
| About `/about` | hero-centered, about-split, team, cta-band |
| Services `/services` | hero-centered, services-images, faq, cta-band |
| Contact `/contact` | hero-centered, contact |

## Trades (plumber, electrician, builder, cleaner)

Customers arrive in a hurry, often on a phone. Put the phone number
in the nav button and the home hero.

| Page | Sections, in order |
| --- | --- |
| Home | hero-image or hero-split (phone button first), services-grid, features (licensed, insured, guarantee, response time), testimonials-grid, cta-band |
| Services | hero-centered, services-images, pricing (only with real prices), faq, cta-band |
| Service areas `/areas` | hero-centered, about-split (the towns covered, as a list in the RichText), cta-band |
| Our work `/work` | hero-centered, gallery, testimonials-slider, cta-band |
| About | hero-centered, about-split, team, cta-band |
| Contact | hero-centered, contact |

## Hospitality (café, restaurant, bar, bakery)

Customers want the menu, the hours and the address. Hours and address
come from `BUSINESS` in `src/consts.ts`.

| Page | Sections, in order |
| --- | --- |
| Home | hero-image, about-split (the place in a few lines), gallery, testimonials-grid, cta-band ("Find us") |
| Menu `/menu` | hero-centered, then one `faq`-style accordion or `services-grid` per menu section; or link to a PDF menu the client keeps up to date |
| About | hero-centered, about-split, team |
| Visit `/contact` | hero-centered, contact (hours and address first; the form is for bookings or events) |

## Appointments (salon, barber, clinic, trainer)

| Page | Sections, in order |
| --- | --- |
| Home | hero-split, services-images, testimonials-slider, cta-band ("Book now") |
| Services & prices `/services` | hero-centered, pricing or services-grid, faq, cta-band |
| Team `/team` | hero-centered, team, cta-band |
| Contact | hero-centered, contact |

## Professional services (accountant, lawyer, consultant)

Trust matters more than pictures. Lead with credentials and people.

| Page | Sections, in order |
| --- | --- |
| Home | hero-centered, services-grid, features (credentials, experience, who they serve), logo-strip (clients or bodies they belong to), testimonials-grid, cta-band |
| Services | hero-centered, services-grid, faq, cta-band |
| Team `/team` | hero-centered, team, about-split, cta-band |
| Contact | hero-centered, contact |

## Every site, every time

- `404.astro` stays. Its text can be reworded in the client's voice.
- `/sections` and `/example-components` stay out of the nav and out
  of search (`NOINDEX_ROUTES`). Delete `/example-components` if the
  client never needs it; keep `/sections` for future edits.
- Footer: `FOOTER_LINKS` defaults to the nav. Add legal pages (privacy
  policy) there when the client has them; a site with a contact form
  should have a privacy page that says what happens to messages.
