// Checks the brand colours in src/styles/base.css against WCAG 2.2 AA.
// Run after changing any swatch: `npm run check:brand`.
// Exits 1 when a pair fails, so it can gate a build or a CI step.
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/styles/base.css", import.meta.url),
  "utf8",
);

const swatch = (name) => {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--${name} not found in base.css`);
  const value = match[1].trim();
  if (value.startsWith("var(")) return swatch(value.slice(6, -1));
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`--${name} must be a 6-digit hex colour, got ${value}`);
  }
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
};

// color-mix(in srgb, a, b p%) and alpha blending both reduce to this.
const mix = (a, b, amountOfA) =>
  a.map((v, i) => Math.round(v * amountOfA + b[i] * (1 - amountOfA)));

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const c = Object.fromEntries(
  [
    "light-100",
    "light-200",
    "light-300",
    "dark-700",
    "dark-800",
    "dark-900",
    "brand-500",
    "brand-700",
    "brand-text",
  ].map((n) => [n, swatch(n)]),
);
const white = [255, 255, 255];

// Secondary text is the text colour at this opacity (`--text-2`).
const TEXT_2 =
  Number(css.match(/--text-2:[^;]*currentcolor (\d+)%/)[1]) / 100;

// [what, foreground, background, minimum ratio]
// 4.5 = body text, 3 = large text and UI parts (WCAG 1.4.3 / 1.4.11).
const checks = [];
for (const bg of ["light-300", "light-200", "light-100"]) {
  checks.push([`Text on light ${bg}`, c["dark-900"], c[bg], 4.5]);
  checks.push([
    `Secondary text on light ${bg}`,
    mix(c["dark-900"], c[bg], TEXT_2),
    c[bg],
    4.5,
  ]);
}
for (const bg of ["dark-900", "dark-800", "dark-700"]) {
  checks.push([`Text on dark ${bg}`, c["light-100"], c[bg], 4.5]);
  checks.push([
    `Secondary text on dark ${bg}`,
    mix(c["light-100"], c[bg], TEXT_2),
    c[bg],
    4.5,
  ]);
}
checks.push(
  ["Button text on brand colour", c["brand-text"], c["brand-500"], 4.5],
  [
    "Secondary text in brand sections",
    mix(c["brand-text"], c["brand-500"], TEXT_2),
    c["brand-500"],
    4.5,
  ],
  ...["light-300", "light-200", "light-100"].map((bg) => [
    `Heading accent (brand-700) on light ${bg}`,
    c["brand-700"],
    c[bg],
    3,
  ]),
  ["Heading accent on dark", c["brand-500"], c["dark-900"], 3],
  [
    "Heading accent in brand sections",
    mix(c["brand-text"], white, 0.8),
    c["brand-500"],
    3,
  ],
);

let failed = 0;
for (const [label, fg, bg, min] of checks) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failed++;
  console.log(
    `${ok ? "pass" : "FAIL"}  ${ratio.toFixed(2).padStart(5)} : 1` +
      `  (needs ${min})  ${label}`,
  );
}

console.log(
  failed
    ? `\n${failed} pair(s) fail. Adjust the swatches in src/styles/base.css.`
    : "\nAll colour pairs pass WCAG AA.",
);
process.exit(failed ? 1 : 0);
