// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE_URL } from "./src/consts.ts";
import { isNoindexRoute } from "./src/utils/seo.ts";

export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      filter: (page) => !isNoindexRoute(new URL(page).pathname),
    }),
  ],
  fonts: [
    {
      name: "Cormorant Garamond",
      cssVariable: "--font-heading",
      provider: fontProviders.google(),
      weights: [500, 600, 700],
    },
    {
      name: "Jost",
      cssVariable: "--font-primary",
      provider: fontProviders.google(),
      weights: [400, 500, 700],
    },
  ],
  vite: { build: { cssTarget: "safari15.4" } },
});
