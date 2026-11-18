# Launch plan

Decision (18 Nov 2026): the live site goes on **Noah's Hostinger
plan**. No Cloudflare and no Worker. This replaces the 16 Nov
Cloudflare plan. The private review preview (emerald-forest-preview)
stays on Connor's Cloudflare account, because Noah never sees that
account.

## Facts

- emeraldforestfurnishings.com is registered at Hostinger since
  2 Apr 2026 and renews 2 Apr 2027. DNS is Hostinger's
  (`*.dns-parking.com`). None of that changes.
- The current site is WordPress (Hostinger AI builder plus
  Elementor) on PHP 8.5, behind Hostinger's CDN (`server: hcdn`).
- Its contact form is **SureForms**. **SureMail** is the WordPress
  plugin that sends the emails, through whichever connection it is
  set up with (SMTP, Gmail or another provider). We don't know which
  one yet.
- Noah's own email is Gmail.

## How it works on Hostinger

The Astro build is plain static files, which any Hostinger plan
serves. Only the form needs a server side. SureMail only runs inside
WordPress, so the new site sends mail with a small PHP script of our
own on the same hosting, `contact.php`.

- `public/contact.php` takes the form POST. It checks a honeypot
  field, a minimum fill time and a per-IP rate limit, then sends the
  message to Noah's Gmail with PHPMailer over SMTP. It replies with
  JSON, so `FORM_ENDPOINT = "/contact.php"` works with the existing
  Form.astro unchanged.
- **SMTP:** use the connection SureMail already uses, if it sends
  reliably. Otherwise make a mailbox on the domain in hPanel
  (Emails), e.g. `website@emeraldforestfurnishings.com`, and send
  through `smtp.hostinger.com`. Reply-To is set to the customer, so
  Noah only has to press Reply.
- **Secrets:** the SMTP password goes in `form-config.php` **outside
  `public_html`** (one level up). It is uploaded by hand and never
  committed.
- **Redirects and headers:** Apache, so a `public/.htaccess` replaces
  `_redirects`/`_headers`. It holds the 301s from the old WordPress
  URLs (`/blog/`, `/hello-world/`, `/sample-page/`, `/post-*` and
  `/category/*` to sensible pages; `/services/`, `/about/` and
  `/contact/` keep their paths), plus HTTPS and non-www redirects and
  long caching for `/_astro/`. The old URL list is in
  `local-seo-audits/audits/emerald-forest-furnishings/2026-11-16/before/site/`.

## Noah's part (short video)

1. hPanel: give Connor access to his Hostinger account (Account
   sharing / Access management, with Connor's Hostinger login). The
   other option is to send the login over a call, but sharing is
   better.
2. That's it. Connor does the rest.

## Connor's part

1. **Look first** (in WordPress admin, before touching anything):
   - SureMail, Connections: which mailer it uses and whether its
     email log shows recent form emails arriving. That tells us
     whether to reuse its SMTP or make a new mailbox.
   - hPanel: the plan name, whether SSH or Git deploy is available,
     and the CDN / security settings. Any "block AI bots" style
     option must be off, so the AEO work isn't undone.
2. **Back up** WordPress (hPanel, Websites, Backups) and download
   it.
3. **Build the form script** (Claude): `contact.php`, PHPMailer,
   `.htaccess`, and `FORM_ENDPOINT = "/contact.php"`. Test it on a
   subfolder or a staging subdomain first (e.g.
   `new.emeraldforestfurnishings.com` from hPanel, Subdomains), and
   send real test messages to Noah's Gmail. Check they land in the
   inbox, not spam.
4. **Switch over:** run the production build (`npx astro build`,
   with no PUBLIC_REVIEW or PREVIEW_SITE). Move WordPress out of
   `public_html` into a folder outside the web root (don't delete it
   yet). Upload `dist/` to `public_html` using Git deploy, SFTP or
   File Manager zip upload. Put `form-config.php` one level up.
   Purge the Hostinger CDN cache.
5. **Check live:** every page, `robots.txt` and `llms.txt` are ours,
   the old URLs redirect, the form delivers, `www` and http redirect,
   and there are no mixed-content or 404 assets.
6. **After launch:**
   - Search Console: add the domain and submit the sitemap.
   - GA4: set the time zone to New York and mark
     `phone_call_click` and `generate_lead` as key events.
   - Update the Google Business Profile website link if needed.
   - Log the W-items in CHANGES.md.
7. A couple of weeks later, once nothing has broken: delete the old
   WordPress files and database. Noah keeps paying Hostinger as
   before.

## Updates later

Each change is: build, then upload `dist/` again (or push, if Git
deploy is set up). `contact.php` and `.htaccess` ship inside `dist/`
from `public/`. `form-config.php` is never overwritten.

## Update (18 Nov 2026, later): Noah moves it himself

Noah now does the move himself, guided by the website helper
(`helper/`, see `docs/HELPER.md`). The helper also sets up the
contact form, and he uses it afterwards for small text edits on a $5
Claude budget. `contact.php` and `public/lib/` are built, and
`FORM_ENDPOINT` is now `/contact.php`.
