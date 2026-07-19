// Rasterizes the SVG app icon into the PNG sizes the PWA manifest references.
// Runs in `prebuild` so the binaries never need to live in git. Uses `sharp`,
// which ships with Next.js' image pipeline.
import { mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));
const icons = join(root, "public", "icons");
mkdirSync(icons, { recursive: true });

async function main() {
  await sharp(svg).resize(192, 192).png().toFile(join(icons, "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(join(icons, "icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(join(root, "public", "apple-icon.png"));

  // Maskable icon: pad the glyph into the safe zone on a solid background.
  const inner = await sharp(svg).resize(410, 410).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#7c3aed" } })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(join(icons, "maskable-512.png"));

  console.log("Generated PWA icons in public/icons");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
