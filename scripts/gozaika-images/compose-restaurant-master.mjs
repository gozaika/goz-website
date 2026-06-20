#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const MASTER_ROOT = path.join(
  ROOT,
  ".codex-artifacts",
  "gozaika-images",
  "masters",
  "restaurant",
);
const CLEAN_MASTER = path.join(MASTER_ROOT, "restaurant-hero-master-clean.png");
const BRANDED_MASTER = path.join(MASTER_ROOT, "restaurant-hero-master.png");
const DELIVERY_WEBP = path.join(MASTER_ROOT, "restaurant-hero-master.webp");
const METADATA = path.join(MASTER_ROOT, "restaurant-master-system.json");
const FLAME_SVG = path.join(ROOT, "icons", "flame.svg");
const LOGO_SVG = path.join(ROOT, "icons", "gozaika-logo.svg");

const PLACEMENT = {
  flame: { left: 773, top: 305, width: 36, height: 36 },
  logo: { left: 648, top: 451, width: 220, rotationDegrees: 1.8 },
};

function recolorFlameSvg(source, color, opacity) {
  return source
    .replaceAll("#FF6B35", color)
    .replace("<svg ", `<svg opacity="${opacity}" `);
}

async function buildOverlays() {
  const [flameSource, logoSource] = await Promise.all([
    fs.readFile(FLAME_SVG, "utf8"),
    fs.readFile(LOGO_SVG, "utf8"),
  ]);

  const flame = await sharp(
    Buffer.from(recolorFlameSvg(flameSource, "#4A3211", "0.92")),
  )
    .resize(PLACEMENT.flame.width, PLACEMENT.flame.height, { fit: "contain" })
    .png()
    .toBuffer();

  const flameHighlight = await sharp(
    Buffer.from(recolorFlameSvg(flameSource, "#F4D777", "0.34")),
  )
    .resize(PLACEMENT.flame.width, PLACEMENT.flame.height, { fit: "contain" })
    .blur(0.35)
    .png()
    .toBuffer();

  const logo = await sharp(Buffer.from(logoSource))
    .resize({ width: PLACEMENT.logo.width, fit: "contain" })
    // Follow the bag face's subtle down-to-the-right perspective instead of
    // leaving the mark unnaturally parallel to the image canvas.
    .rotate(PLACEMENT.logo.rotationDegrees, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return { flame, flameHighlight, logo };
}

async function composeMaster() {
  const { flame, flameHighlight, logo } = await buildOverlays();

  await sharp(CLEAN_MASTER)
    .ensureAlpha()
    .composite([
      {
        input: flameHighlight,
        left: PLACEMENT.flame.left - 1,
        top: PLACEMENT.flame.top - 1,
        blend: "screen",
      },
      {
        input: flame,
        left: PLACEMENT.flame.left,
        top: PLACEMENT.flame.top,
        blend: "multiply",
      },
      {
        input: logo,
        left: PLACEMENT.logo.left,
        top: PLACEMENT.logo.top,
        blend: "multiply",
        opacity: 0.94,
      },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(BRANDED_MASTER);

  await sharp(BRANDED_MASTER)
    .webp({ quality: 91, effort: 6, smartSubsample: true })
    .toFile(DELIVERY_WEBP);
}

async function writeMetadata() {
  const metadata = {
    version: 1,
    status: "locked",
    selectedCandidate: "restaurant-hero-03",
    selectionRationale:
      "Sunlit hospitality, balanced tableware and consumer-lifestyle warmth connect restaurant partnership to diner discovery.",
    source: path.relative(ROOT, CLEAN_MASTER),
    canonicalBrandAssets: {
      logo: path.relative(ROOT, LOGO_SVG),
      bamFlameDrop: path.relative(ROOT, FLAME_SVG),
    },
    branding: {
      flamePlacement: PLACEMENT.flame,
      flameTreatment: "Exact BAM flame-drop SVG with restrained engraved-metal treatment",
      logoPlacement: PLACEMENT.logo,
      logoTreatment: "Exact full-colour goZaika SVG with matte multiply print treatment",
      tagTreatment: "Intentionally blank for future operational or partner overlays",
    },
    outputs: [BRANDED_MASTER, DELIVERY_WEBP].map((file) => path.relative(ROOT, file)),
  };

  await fs.writeFile(METADATA, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

await composeMaster();
await writeMetadata();

console.log(
  JSON.stringify(
    {
      selectedCandidate: "restaurant-hero-03",
      brandedMaster: path.relative(ROOT, BRANDED_MASTER),
      deliveryWebp: path.relative(ROOT, DELIVERY_WEBP),
      metadata: path.relative(ROOT, METADATA),
    },
    null,
    2,
  ),
);
