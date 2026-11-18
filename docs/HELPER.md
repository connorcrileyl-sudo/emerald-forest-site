# Website helper (`helper/`)

A password-protected page at `emeraldforestfurnishings.com/helper/`
on Noah's Hostinger hosting. Claude in it:

1. walks Noah through moving from WordPress to the new site
   (the contact form needs no setup: it uses Web3Forms),
2. afterwards makes small text edits that Noah approves.

A meter at the top shows how much of the $5 has been used.

## How it fits together

- `helper/index.php`: login, the chat, the meter and the page itself.
  `helper/tools.php`: what Claude may look at and propose.
- Claude never changes the site by itself. Edits, the site switch
  and the restore show up as cards, and only Noah's click applies
  them. Each edit is backed up first; "Undo last edit" restores it.
- Claude is reached through the **api-storehouse** with its own
  caller token (in `helper/config.php`). The storehouse holds the
  real Anthropic key and enforces a **$5 lifetime budget** (table
  `budgets`, `scripts/budget.mjs`). That budget never resets. The
  meter reads `GET /_budget`. Revoke the caller to cut it off.
- Data (password hash, chat, backups, logs) lives in `helper-data/`
  next to `public_html`, not inside it.
- **`helper-data/edits.log`** lists every edit Noah applies, as
  find/replace JSON. The edits change the built HTML on the server,
  not `src/`. Before uploading a new build, copy those edits into
  the source, or the upload will undo them.
- The contact form posts to **Web3Forms** (free, 250 a month; key
  and endpoint in `src/consts.ts`). Each enquiry is emailed to Noah's
  Gmail and kept 30 days in the Web3Forms dashboard (Connor's
  account, Noah's Gmail as the recipient). The helper has no mail
  settings; SureForms and SureMail just go away with WordPress.
- The switch moves everything in `public_html` (except `helper/`,
  `.well-known/` and `cgi-bin/`) into `old-site-<date>/` next to it,
  then unpacks the new site from `helper/site.zip`. Nothing is
  deleted, and the WordPress database is untouched.

## Making the zip for Noah

1. Storehouse (Connor's terminal, in `~/Projects/api-storehouse`):
   ```
   npx wrangler d1 execute storehouse --remote --file schema.sql
   npx wrangler deploy
   node scripts/new-caller.mjs emerald-helper anthropic --no-lock
   node scripts/budget.mjs emerald-helper anthropic 5
   ```
   `--no-lock` means the helper works without an Ente unlock. The
   $5 budget and the single service are what limit it.
2. `cp helper/config.sample.php helper/config.php` and fill in the
   token and a setup code.
3. `npx astro build` (production: no PREVIEW_SITE or PUBLIC_REVIEW),
   then `node scripts/package-helper.mjs`, which writes
   `emerald-helper.zip`.
4. Send Noah the zip and the setup code **separately**. He uploads
   the zip in hPanel File Manager into `public_html`, extracts it,
   opens `/helper/`, enters the code and picks a password.

## Not tested yet

There is no PHP on Connor's PC, so the PHP has not been run. Test it
on Hostinger before Noah uses it, ideally on a subdomain first.
