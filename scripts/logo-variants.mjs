// Makes one-colour light and dark versions of the logo for the brand kit
// (public/brand/). The traced logo becomes a stencil (an SVG mask) in
// its own drawing order: gold and green shapes let the colour through;
// near-black shapes (the frame's fill, letter holes such as the D's,
// which are black shapes drawn over solid letters) and the deepest
// shading greens cut it out. So holes stay holes and leaves stay
// separate. Run: node scripts/logo-variants.mjs
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import sharp from "sharp";

const src = readFileSync("src/assets/logo/logo.svg", "utf8");
const lum = (hex) => {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const DARK_GREEN = Number(process.env.DARK_GREEN ?? 0.16);
const keep = (hex) => {
	const l = lum(hex);
	if (l < 0.06) return false; // blacks
	const [r, g] = [1, 3].map((i) => parseInt(hex.slice(i, i + 2), 16));
	if (g > r && l < DARK_GREEN) return false; // deep shading greens
	return true;
};
const open = src.slice(0, src.indexOf(">", src.indexOf("<svg")) + 1);
const [, , vw, vh] = /viewBox="([^"]+)"/.exec(open)[1].split(/\s+/).map(Number);
const defsEnd = src.indexOf("</defs>") + "</defs>".length;
const defs = src.slice(open.length, defsEnd)
	.replace(/fill:\s*(#[0-9a-fA-F]{6})/g, (_, h) => `fill: ${keep(h) ? "#fff" : "#000"}`)
	.replace(/stop-color="(#[0-9a-fA-F]{6})"/g, 'stop-color="#fff"');
const body = src.slice(defsEnd, src.lastIndexOf("</svg>")).replace(/stop-color="(#[0-9a-fA-F]{6})"/g, 'stop-color="#fff"');
const recolour = (ink) =>
	`${open}${defs}<mask id="stencil" maskUnits="userSpaceOnUse" x="0" y="0" width="${vw}" height="${vh}">${body}</mask>` +
	`<rect width="${vw}" height="${vh}" fill="${ink}" mask="url(#stencil)"/></svg>`;

const out = "public/brand";
copyFileSync("src/assets/logo/logo.svg", `${out}/logo.svg`);
writeFileSync(`${out}/logo-light.svg`, recolour("#faf5e5"));
writeFileSync(`${out}/logo-dark.svg`, recolour("#060907"));
for (const n of ["logo", "logo-light", "logo-dark"]) {
	await sharp(`${out}/${n}.svg`, { density: 400 }).resize({ width: 1200 }).png({ compressionLevel: 9 }).toFile(`${out}/${n}.png`);
}
console.log("wrote logo, logo-light, logo-dark (.svg + .png)");
