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
  "about",
);
const CLEAN_MASTER = path.join(MASTER_ROOT, "about-culture-master-clean.png");
const BRANDED_MASTER = path.join(MASTER_ROOT, "about-culture-master.png");
const DELIVERY_WEBP = path.join(MASTER_ROOT, "about-culture-master.webp");
const METADATA = path.join(MASTER_ROOT, "about-master-system.json");
const FLAME_SVG = path.join(ROOT, "icons", "flame.svg");
const LOGO_SVG = path.join(ROOT, "icons", "gozaika-logo.svg");

const PLACEMENT = {
  flame: { left: 416, top: 286, width: 30, height: 30 },
  logo: { left: 315, top: 410, width: 172, rotationDegrees: 1.2 },
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
    selectedCandidate: "about-culture-04",
    selectionRationale:
      "Strongest curry-leaf motif, balanced shared-table narrative, credible anatomy and warm inclusive editorial composition.",
    source: path.relative(ROOT, CLEAN_MASTER),
    canonicalBrandAssets: {
      logo: path.relative(ROOT, LOGO_SVG),
      bamFlameDrop: path.relative(ROOT, FLAME_SVG),
    },
    branding: {
      flamePlacement: PLACEMENT.flame,
      flameTreatment: "Exact BAM flame-drop SVG with restrained engraved-metal treatment",
      logoPlacement: PLACEMENT.logo,
      logoTreatment: "Exact full-colour goZaika SVG, perspective-aligned matte print",
      tagTreatment: "Intentionally blank for future operational or campaign overlays",
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
      selectedCandidate: "about-culture-04",
      brandedMaster: path.relative(ROOT, BRANDED_MASTER),
      deliveryWebp: path.relative(ROOT, DELIVERY_WEBP),
      metadata: path.relative(ROOT, METADATA),
    },
    null,
    2,
  ),
);
