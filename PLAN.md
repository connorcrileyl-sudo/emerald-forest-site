# Plan: Lumos client-site starter

Goal: a repo you duplicate per client, where an AI (Claude Code) can
build a complete, accessible small-business site in one session from
a short brief, and you polish it visually in Stacki afterwards.

Built on Lumos for Astro 1.0.1 (scaffolded 2026-10-29 with
`npm create lumos`). **Astro only** — no React, Vue, Svelte or any
other UI framework, ever. Interactivity is Lumos's own small
`<script>` tags. Plain CSS and custom properties, no Tailwind.

---

## 1. Key decision: section recipes, not section components

Lumos ships building blocks (Section, ContentWrapper, Grid, Heading,
Card, Button, Accordion, Form…) but no Hero/Services/Pricing. Its own
rules (`LUMOS.md`) say **don't** wrap an ordinary layout in a custom
component — only make one when it owns custom CSS or a script.

So instead of `<Hero title="…" />` components we ship **recipes**:
copy-ready snippets of Lumos markup for each section, in
`recipes/`. The AI copies one into a page and fills in the text.

Why this is the better fit:

- **Stacki can edit it.** The markup sits in the page, so clicking a
  hero headline in Stacki edits that page only. A wrapped `<Hero>`
  hides it behind props, and editing the component source changes it
  on every page (the same trap Piny had).
- **Follows Lumos's rules**, so `lumos-upgrade-version` keeps working
  and future Lumos releases merge cleanly.
- **The AI still gets consistency** — it copies tested markup instead
  of inventing layout each time.

Exception: a section that genuinely needs its own CSS or script
(e.g. a testimonial slider with custom quote styling) becomes a
content block in `src/components/content/`, named by Lumos's
convention (`HeroSplit`, `TestimonialsSlider`, `CtaBanner`).

## 2. Phases

### Phase 0 — Setup (done / small)

- [x] Scaffold with `npm create lumos@latest`.
- [x] `git init`, first commit, this plan.
- [x] **Upgrade Node** to ≥ 22.23.4 (now 22.23.4). Current is 22.23.2 and Astro
      7.4 warns about it; `npm run dev` may refuse until upgraded.
- [x] Create the GitHub repo (private) and push. Mark it as a
      **template repo** so each client is "Use this template".
- [ ] Open it in Stacki once to confirm canvas select works with
      Astro 7 (Stacki injects its own markers, so the Astro 6 pin
      the Piny template needed should not apply — verify).

### Phase 1 — One place for client facts (done)

Lumos keeps site facts in `src/consts.ts`, but Nav and Footer links
are hard-coded. Make every client-specific fact live in one file:

- Extend `src/consts.ts` with: business name, tagline, phone, email,
  address, hours, nav links, footer links, social links.
- Change `Nav.astro` / `Footer.astro` to loop over those links and
  show phone/email/socials, instead of hard-coded `<NavLink>`s.
- Keep Lumos's prop/comment conventions so `lumos-audit-props` stays
  happy. Note these two files as "customized" for upgrades.

### Phase 2 — Branding in one step

- Document exactly which tokens in `src/styles/base.css` change per
  client: `--brand-500`, `--brand-text`, the light/dark swatches,
  `--primary-family`, radius. Add a short "rebrand" comment block at
  the top of that region.
- Font swap procedure: drop a woff2 in `src/assets/fonts/`, point
  `--primary-family` at it (follow how Inter is wired now). Free/OFL
  fonts only.
- Logo swap: replace `src/assets/logo/logo.svg` + `logo-icon.svg`.
- Contrast check: brand colour vs `--brand-text` must pass WCAG AA;
  Stacki's Variables panel shows this live, and the skill (Phase 4)
  checks it in code.

### Phase 3 — Section recipe library (`recipes/`)

One Markdown file per section: what it's for, the snippet, which bits
to change, and which variants/props to flip. Built from Lumos
components only, each one checked at 320 / 768 / 1440 px and with
keyboard only.

| Recipe | Built from |
| --- | --- |
| Hero — split (text + image) | Section, ContentWrapper `columns`, Img |
| Hero — centred | Section, ContentWrapper `stack centered` |
| Hero — image card | ContentWrapper `card` (as the starter home) |
| Services grid | Grid `autofit`, Card |
| Feature / why-us list | Grid, Icon, Heading, Paragraph |
| About / story | ContentWrapper `columns`, RichText, Img |
| Team | Grid, Card `stacked` |
| Testimonials | Slider or Grid, Card |
| Pricing | Grid, Card, Button |
| FAQ | Accordion, AccordionItem |
| Call to action band | Section `theme="brand"`, ButtonWrapper |
| Contact form + details | Form, Input, Textarea, ContentWrapper |
| Logo strip | Marquee, Img |
| Gallery | Grid, Img, Modal |

Plus a `recipes/README.md` index the AI reads first.

Also a live `/sections` page (like the Piny template's
`/style-guide`) that renders every recipe, so you can see them all
and Stacki can open it. Marked `noindex` in `NOINDEX_ROUTES`.

### Phase 4 — Page recipes (`recipes/pages/`)

Starting page sets per business type, listing which sections go on
which page in what order:

- Default small business: Home, About, Services, Contact, 404.
- Trades (plumber, electrician): + Service areas, emergency CTA.
- Hospitality (café, restaurant): + Menu, Hours/location.
- Professional services (accountant, lawyer): + Team, FAQ.

### Phase 5 — The `build-client-site` skill

`.agents/skills/build-client-site/SKILL.md`, with the
`.claude/skills/` symlink Lumos's `AGENTS.md` asks for. It's what
makes "build a site for Joe's Plumbing" work in one go.

Steps the skill walks the AI through:

1. **Brief.** Collect or ask for: business name, type, location,
   services, colours (or logo to pull them from), pages wanted,
   phone/email/address/hours, tone. Never invent business facts —
   leave a visible `TODO` instead.
2. **Facts** → `src/consts.ts` (Phase 1).
3. **Brand** → `base.css` tokens, font, logo (Phase 2), with a
   contrast check.
4. **Pages** → pick a page recipe, build each page from section
   recipes, write real copy in the client's tone.
5. **Clean up** the Lumos demo: remove `example-components`, the
   style-guide home, demo assets.
6. **Verify**: `npm run check`, `npm run build`, screenshot each page
   at 375 / 768 / 1440, keyboard tab-through, fix what's broken.
7. **Report**: what it built, every `TODO` left, what to check by eye.

Optional helper script `scripts/check-site.mjs`: finds leftover
`TODO`s, demo text ("Lumos"), missing alt text, and placeholder
links. The skill runs it in step 6.

### Phase 6 — Docs for this repo

- Rewrite `README.md`: what this is, how to start a client, how to
  use Stacki with it.
- Add a project section to `AGENTS.md` pointing at `recipes/` and
  the skill; keep Lumos's own text intact so upgrades merge.
- `CLAUDE.md` (one line: "Read AGENTS.md") so Claude Code picks it up.

### Phase 7 — Trial run

Build one fake client end to end with the skill (e.g. "Riverside
Plumbing"), on a throwaway branch. Time it, note every place the AI
stalled or guessed, fix the recipes/skill, repeat once.

## 3. Later / optional

- **Blog** via an Astro content collection (Lumos has
  `FormattedDate` + `RichText` ready for it).
- **Brand data for the poster creator**: port `/brand.json` and the
  business-details fields from `astro-client-site-template` if this
  starter replaces that one for real clients.
- **Google Places lookup** (`npm run google`) from the same template.
- Deploy notes (Lumos docs has a Deploying guide).

## 4. Rules for whoever works on this

- Astro components only. No `@astrojs/react` / `vue` / `svelte`,
  no client-side framework islands.
- Follow `LUMOS.md`'s checklists for any new CSS or component.
- Don't hand-edit Lumos library components unless the plan says so
  (Nav/Footer in Phase 1); list every edited one in README so
  `lumos-upgrade-version` can be checked against it.
- Keep text measure around 75 characters in docs and UI.
