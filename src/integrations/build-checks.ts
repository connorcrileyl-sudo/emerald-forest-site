/*
 * Two build steps, run once the pages are written:
 *
 * - llmsTxt() writes /llms.txt, a plain summary of the business and
 *   every indexable page for AI tools. Titles and descriptions are read
 *   from the built pages, so it never drifts from them or consts.ts.
 * - noTodo() fails the build if "TODO (" placeholder copy reached the
 *   output. Pages hide it with `import.meta.env.DEV`; this catches any
 *   that slip through.
 */
import type { AstroIntegration } from "astro";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  BUSINESS,
  TOWNS,
  FOOTER_LINKS,
  GOOGLE_PROFILE_URL,
} from "../consts.ts";
import { isNoindexRoute } from "../utils/seo.ts";

const files = (dir: string, ext: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory())
      return name === "_astro" ? [] : files(full, ext);
    return name.endsWith(ext) ? [full] : [];
  });

const decode = (text: string) =>
  text
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const routeOf = (dist: string, file: string) =>
  "/" +
  relative(dist, file)
    .split(sep)
    .join("/")
    .replace(/(^|\/)index\.html$/, "$1")
    .replace(/\.html$/, "");

export function llmsTxt(): AstroIntegration {
  return {
    name: "llms-txt",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const dist = fileURLToPath(dir);
        const pages = files(dist, ".html")
          .map((file) => {
            const html = readFileSync(file, "utf8");
            const meta = (pattern: RegExp) =>
              decode(html.match(pattern)?.[1] ?? "");
            return {
              route: routeOf(dist, file),
              title: meta(/<title>([^<]*)<\/title>/)
                .replace(` | ${SITE_NAME}`, ""),
              description: meta(/<meta name="description" content="([^"]*)"/),
              noindex: /<meta name="robots" content="[^"]*noindex/.test(html),
            };
          })
          .filter((page) => !page.noindex && !isNoindexRoute(page.route));

        const order = ["/", "/services/", ...FOOTER_LINKS.map((l) => l.href)];
        const rank = (route: string) =>
          order.includes(route) ? order.indexOf(route) : order.length;
        pages.sort((a, b) => rank(a.route) - rank(b.route));

        const about = pages.find((page) => page.route === "/about/");
        const towns = `${TOWNS.slice(0, -1).join(", ")} and ${TOWNS.at(-1)}`;
        const lines = [
          `# ${SITE_NAME}`,
          "",
          `> ${SITE_DESCRIPTION}`,
          "",
          ...(about?.description ? [about.description, ""] : []),
          `- Phone: ${BUSINESS.phone}`,
          `- Service area: ${towns}, NC`,
          `- Google Business Profile: ${GOOGLE_PROFILE_URL}`,
          "",
          "## Pages",
          "",
          ...pages.map(
            (page) =>
              `- [${page.title || SITE_NAME}](${new URL(page.route, SITE_URL).href})` +
              (page.description ? `: ${page.description}` : ""),
          ),
        ];
        writeFileSync(join(dist, "llms.txt"), `${lines.join("\n")}\n`);
      },
    },
  };
}

export function noTodo(): AstroIntegration {
  return {
    name: "no-todo",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const dist = fileURLToPath(dir);
        const found = [...files(dist, ".html"), ...files(dist, ".txt")]
          .filter((file) => readFileSync(file, "utf8").includes("TODO ("))
          .map((file) => relative(dist, file));
        if (found.length)
          throw new Error(
            `"TODO (" placeholder copy in the build: ${found.join(", ")}. ` +
              "Wrap it in import.meta.env.DEV or replace it.",
          );
      },
    },
  };
}
