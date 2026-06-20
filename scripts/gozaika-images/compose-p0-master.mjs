#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ARTIFACT_ROOT = path.join(ROOT, ".codex-artifacts", "gozaika-images");
const MASTER_ROOT = path.join(ARTIFACT_ROOT, "masters-final");
const FLAME_SVG = path.join(ROOT, "icons", "flame.svg");
const LOGO_SVG = path.join(ROOT, "icons", "gozaika-logo.svg");

const PORTRAIT_CLEAN = path.join(
  MASTER_ROOT,
  "portrait",
  "hero-portrait-master-clean.png",
);
const PORTRAIT_BRANDED = path.join(
  MASTER_ROOT,
  "portrait",
  "hero-portrait-master.png",
);
const PORTRAIT_WEBP = path.join(
  MASTER_ROOT,
  "portrait",
  "hero-portrait-master.webp",
);

const PORTRAIT_PLACEMENT = {
  flame: { left: 491, top: 690, width: 42, height: 42 },
  logo: { left: 392, top: 810, width: 240 },
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
    .resize(PORTRAIT_PLACEMENT.flame.width, PORTRAIT_PLACEMENT.flame.height, {
      fit: "contain",
    })
    .png()
    .toBuffer();

  const flameHighlight = await sharp(
    Buffer.from(recolorFlameSvg(flameSource, "#F4D777", "0.34")),
  )
    .resize(PORTRAIT_PLACEMENT.flame.width, PORTRAIT_PLACEMENT.flame.height, {
      fit: "contain",
    })
    .blur(0.35)
    .png()
    .toBuffer();

  const logo = await sharp(Buffer.from(logoSource))
    .resize({ width: PORTRAIT_PLACEMENT.logo.width, fit: "contain" })
    .png()
    .toBuffer();

  return { flame, flameHighlight, logo };
}

async function buildPortraitMaster() {
  const { flame, flameHighlight, logo } = await buildOverlays();

  await sharp(PORTRAIT_CLEAN)
    .ensureAlpha()
    .composite([
      {
        input: flameHighlight,
        left: PORTRAIT_PLACEMENT.flame.left - 1,
        top: PORTRAIT_PLACEMENT.flame.top - 1,
        blend: "screen",
      },
      {
        input: flame,
        left: PORTRAIT_PLACEMENT.flame.left,
        top: PORTRAIT_PLACEMENT.flame.top,
        blend: "multiply",
      },
      {
        input: logo,
        left: PORTRAIT_PLACEMENT.logo.left,
        top: PORTRAIT_PLACEMENT.logo.top,
        blend: "multiply",
        opacity: 0.94,
      },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(PORTRAIT_BRANDED);

  await sharp(PORTRAIT_BRANDED)
    .webp({ quality: 91, effort: 6, smartSubsample: true })
    .toFile(PORTRAIT_WEBP);
}

async function writeMetadata() {
  const metadata = {
    version: 2,
    status: "locked",
    canonicalBrandAssets: {
      logo: path.relative(ROOT, LOGO_SVG),
      bamFlameDrop: path.relative(ROOT, FLAME_SVG),
    },
    square: {
      selectedCandidate: "p0-square-03",
      cleanGenerationAnchor: "anchors/master-style-anchor-clean.png",
      brandedGenerationAnchor: "anchors/master-style-anchor-branded.png",
      nativeMaster: "square/hero-square-master.png",
      deliveryPng: "square/hero-square-master-2048.png",
      deliveryWebp: "square/hero-square-master-2048.webp",
    },
    portrait: {
      selectedCandidate: "p0-portrait-03",
      cleanMaster: "portrait/hero-portrait-master-clean.png",
      brandedMaster: "portrait/hero-portrait-master.png",
      deliveryWebp: "portrait/hero-portrait-master.webp",
      branding: {
        flamePlacement: PORTRAIT_PLACEMENT.flame,
        flameTreatment: "Exact canonical SVG with restrained engraved-metal treatment",
        logoPlacement: PORTRAIT_PLACEMENT.logo,
        logoTreatment: "Exact canonical full-colour SVG with matte multiply print treatment",
      },
    },
    derivativeRule:
      "Generate from the clean square anchor, then apply canonical SVG branding deterministically. Never ask an image model to redraw the logo or BAM flame-drop.",
  };

  await fs.writeFile(
    path.join(MASTER_ROOT, "master-system.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
}

await buildPortraitMaster();
await writeMetadata();

console.log(
  JSON.stringify(
    {
      portraitMaster: path.relative(ROOT, PORTRAIT_BRANDED),
      portraitWebp: path.relative(ROOT, PORTRAIT_WEBP),
      metadata: path.relative(ROOT, path.join(MASTER_ROOT, "master-system.json")),
    },
    null,
    2,
  ),
);
