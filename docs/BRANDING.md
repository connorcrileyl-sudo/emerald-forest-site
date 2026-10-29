# Branding a client site

Four things change per client: colours, font, logo, and the small
images browsers and social sites use. Business details (name, phone,
links) are separate: they live in `src/consts.ts`.

Do the steps in order, then run the checks at the end.

## 1. Colours — `src/styles/base.css`

All client colours are the swatches at the top of `:root`, under the
"Client brand" comment. Use 6-digit hex only; the checker reads them.

| Swatch | Used for |
| --- | --- |
| `--brand-500` | The main brand colour: buttons, brand sections |
| `--brand-text` | Text on `--brand-500` (button labels, brand sections) |
| `--brand-700` | Darker shade: highlighted heading words on light backgrounds |
| `--brand-300` | Lighter shade: highlighted heading words on dark backgrounds |
| `--light-100/200/300` | Light page backgrounds, lightest to darkest |
| `--dark-700/800/900` | Dark page backgrounds, lightest to darkest |

How to pick them:

- Start from the client's main colour as `--brand-500`.
- `--brand-text` is usually `#ffffff` for a dark or saturated brand
  colour and `--dark-900` for a pale one. Whichever passes.
- `--brand-700` and `--brand-300` are the same hue, darker and
  lighter. For a pale brand colour (like the default lime), `--brand-300`
  can equal `--brand-500`.
- The light and dark greys rarely need changing. Tint them slightly
  toward the brand hue if the client wants a warmer or cooler feel.

Then run:

```
npm run check:brand
```

It checks every text/background pair on every theme against WCAG AA
and exits with an error if one fails. Adjust the failing swatch and run
it again. Do not ship with a failure.

## 2. Font — `astro.config.mjs`

The site uses one family through `--font-primary`. Only the `fonts`
block in `astro.config.mjs` changes. Lumos uses weights 400, 500 and
700, so load those three.

**A Google font** (downloaded at build time and served from the site
itself, so visitors never contact Google):

```js
fonts: [
  {
    name: "Outfit",
    cssVariable: "--font-primary",
    provider: fontProviders.google(),
    weights: [400, 500, 700],
  },
],
```

**The client's own font files** (free/OFL licence, or one the client
has a web licence for): put the `.woff2` files in `src/assets/fonts/`
and list one variant per weight:

```js
fonts: [
  {
    name: "Client Sans",
    cssVariable: "--font-primary",
    provider: fontProviders.local(),
    options: {
      variants: [
        { weight: 400, style: "normal", src: ["./src/assets/fonts/client-sans-400.woff2"] },
        { weight: 500, style: "normal", src: ["./src/assets/fonts/client-sans-500.woff2"] },
        { weight: 700, style: "normal", src: ["./src/assets/fonts/client-sans-700.woff2"] },
      ],
    },
  },
],
```

Keep `cssVariable` as `--font-primary`; nothing else needs to change.
Delete `src/assets/fonts/inter-regular.woff2` once it is unused.

## 3. Logo — `src/assets/logo/`

- `logo.svg` is shown in the nav and footer. Replace it with the
  client's logo as an SVG.
- For a one-colour logo, set its fills to `fill="currentColor"`. It
  then turns white on dark pages and dark on light pages by itself.
  A multi-colour logo keeps its own colours; check it on both a light
  and a dark page.
- Remove the `width` and `height` attributes from the `<svg>` tag and
  keep the `viewBox`, so it scales cleanly.
- Size it with `--logo-width-nav` and `--logo-width-footer` in
  `base.css`. The defaults suit a wide wordmark. A square mark needs
  about `3rem` in the nav, or it grows taller than the bar.
- `logo-icon.svg` is the square mark Lumos uses on its demo home page.
  Replace it too, or delete it once nothing imports it.

## 4. Favicon and social image — `public/`

- `favicon.svg`: the square mark, coloured, on a transparent or solid
  background. It shows in browser tabs.
- `favicon.ico`: a 32×32 fallback for older browsers. Export it from
  the same mark.
- `og-image.jpg`: the picture shown when a link is shared on social
  media or in a message. 1200×630, logo and business name, under
  300 KB.

## 5. Check it

```
npm run check:brand
npm run check
npm run build
```

Then look at a light page and a dark page at phone width (375px),
tablet (768px) and desktop (1280px). Check the logo isn't squashed,
cropped or too big, and that buttons and highlighted heading words are
easy to read.
