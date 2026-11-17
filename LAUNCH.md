# Launch plan

Decision (16 Nov 2026): host the live site on Cloudflare, not Noah's
Hostinger plan. Connor will send Noah a video walkthrough of his part
in the next day or two.

The Cloudflare account is **Noah's**, not Connor's. Noah creates it
and adds Connor as a member; Connor sets everything up inside it from
his own login. Noah owns his site and domain, and if they ever part
ways nothing has to move. The private review preview
(emerald-forest-preview) stays on Connor's account.

## Domain facts

- emeraldforestfurnishings.com is registered at **Hostinger** since
  2 Apr 2026; renews 2 Apr 2027.
- DNS is on Hostinger's name servers (`*.dns-parking.com`).
- The transfer lock is on (Hostinger's default). It doesn't block
  changing name servers, only moving the registration.
- Noah's email is Gmail, so moving DNS can't break any mail.
- The current site is WordPress, made with Hostinger's AI builder.

## Noah's part (for the video)

1. Make a free Cloudflare account at dash.cloudflare.com with his own
   email (and turn on two-factor login).
2. In it, Manage Account, Members, Invite: Connor's email, role
   **Administrator**. Tell Connor when it's sent.
3. Hostinger hPanel: back up the WordPress site (Websites, Backups).
4. hPanel, Domains, the domain, Nameservers: paste the two Cloudflare
   name servers Connor sends him.
5. Later, optional: turn off **Transfer lock** and send Connor the
   **EPP / authorization code**, so the registration can move into
   his own Cloudflare account (at-cost renewal).

## Connor's part

1. Accept Noah's member invite. Then, inside **his** account: Add a
   site, `emeraldforestfurnishings.com`, Free plan. Copy the name
   servers it gives to Noah.
2. **Let AI crawlers in.** New Cloudflare sites block AI bots by
   default, which would undo the AEO work (ChatGPT, Perplexity,
   Google AI answers). In the zone:
   - AI Crawl Control / Bots: turn **off** "Block AI bots" (or set
     it to allow).
   - Turn **off** the managed robots.txt that disallows AI crawlers,
     so the site's own robots.txt and llms.txt are served.
   - Leave Bot Fight Mode off, so real crawlers aren't challenged.
   - Afterwards check `https://emeraldforestfurnishings.com/robots.txt`
     is ours, not Cloudflare's.
3. Deploy the production build (`npx astro build`, no PUBLIC_REVIEW
   or PREVIEW_SITE) as its own Worker with static assets, in Noah's
   account (`account_id` of his account in the production Wrangler
   config, so it never lands on Connor's), and attach the domain and
   `www` as custom domains.
4. Add `public/_redirects` with 301s from the old WordPress URLs
   (`/services/`, `/about/`, `/contact/` keep their paths; map
   `/blog/`, `/hello-world/`, `/sample-page/`, `/post-*` and
   `/category/*` to sensible pages). Old URL list is in
   `local-seo-audits/audits/emerald-forest-furnishings/2026-11-16/before/site/`.
5. Set `FORM_ENDPOINT` (or a small Worker that emails Noah) before
   the switch. Until then the form says "sent" and delivers nothing.
   The Worker route isn't easy by hand (email sending, spam
   protection, secrets), so have Claude build and deploy it, the same
   way as the questions form in `~/esteemed-intake`. Formspree is the
   no-code fallback: make a form, paste its URL into `FORM_ENDPOINT`.
6. After launch:
   - Search Console: add the domain, submit the sitemap.
   - GA4: set the time zone to New York and mark `phone_call_click`
     and `generate_lead` as key events.
   - Update the Google Business Profile website link if needed.
   - Log the W-items in CHANGES.md.
7. Cancel the Hostinger hosting only once the new site is live and
   the WordPress backup is downloaded. Keep the domain until it's
   transferred.
