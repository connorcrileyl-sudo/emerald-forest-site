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
  fonts: [
    {
      name: "Libre Caslon Text",
      cssVariable: "--font-heading",
      provider: fontProviders.google(),
      weights: [400, 700],
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
