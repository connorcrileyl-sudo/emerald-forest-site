// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE_URL } from "./src/consts.ts";
import { isNoindexRoute } from "./src/utils/seo.ts";
import { llmsTxt, noTodo } from "./src/integrations/build-checks.ts";

export default defineConfig({
  // PREVIEW_SITE: the private preview's own address, so its share
  // links and preview images point at the preview, not the live domain.
  site: process.env.PREVIEW_SITE || SITE_URL,
  integrations: [
    sitemap({
      filter: (page) => !isNoindexRoute(new URL(page).pathname),
    }),
    llmsTxt(),
    noTodo(),
  ],
  // Both fonts are OFL, kept in the repo (latin subset, copied from
  // what Google served) so builds never fetch them and /brand.json can
  // hand the same files to the poster tools.
  fonts: [
    {
      name: "Libre Caslon Text",
      cssVariable: "--font-heading",
      provider: fontProviders.local(),
      options: {
        variants: [
          { weight: 400, style: "normal", src: ["./src/assets/fonts/libre-caslon-text-400.woff2"] },
          { weight: 400, style: "italic", src: ["./src/assets/fonts/libre-caslon-text-400-italic.woff2"] },
          { weight: 700, style: "normal", src: ["./src/assets/fonts/libre-caslon-text-700.woff2"] },
        ],
      },
    },
    {
      name: "Jost",
      cssVariable: "--font-primary",
      provider: fontProviders.local(),
      options: {
        variants: [
          // One variable file covers every weight; listed per weight so
          // the brand kit can read them.
          { weight: 400, style: "normal", src: ["./src/assets/fonts/jost-variable.woff2"] },
          { weight: 500, style: "normal", src: ["./src/assets/fonts/jost-variable.woff2"] },
          { weight: 700, style: "normal", src: ["./src/assets/fonts/jost-variable.woff2"] },
          { weight: 400, style: "italic", src: ["./src/assets/fonts/jost-variable-italic.woff2"] },
        ],
      },
    },
  ],
  vite: { build: { cssTarget: "safari15.4" } },
});
