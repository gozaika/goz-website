#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ARTIFACT_ROOT = path.join(ROOT, ".codex-artifacts", "gozaika-images");
const MASTER_ROOT = path.join(ARTIFACT_ROOT, "masters", "social");
const REVIEW_ROOT = path.join(ARTIFACT_ROOT, "working", "03-social-compositions");
const PUBLIC_ROOT = path.join(ROOT, "apps", "website", "public", "images", "social");
const LINKEDIN_BACKGROUND_MASTER = path.join(
  MASTER_ROOT,
  "linkedin-banner-background-master.png",
);
const SQUARE_MASTER = path.join(
  ARTIFACT_ROOT,
  "masters",
  "anchors",
  "master-style-anchor-branded.png",
);
const PORTRAIT_MASTER = path.join(
  ARTIFACT_ROOT,
  "masters",
  "portrait",
  "hero-portrait-master.png",
);
const LOGO_PATH = path.join(ROOT, "icons", "gozaika-logo.svg");
const FLAME_PATH = path.join(ROOT, "icons", "flame.svg");

const COLORS = {
  forest: "#0D3F29",
  green: "#1A5C38",
  orange: "#FF6B35",
  gold: "#D4A017",
  cream: "#FFF8F0",
  pale: "#EAF3DE",
};

function parseArgs(argv) {
  const args = { linkedinBackground: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--linkedin-background") args.linkedinBackground = argv[++index];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svgCanvas(width, height, body) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  );
}

function recolorSvg(source, replacements) {
  return Object.entries(replacements).reduce(
    (result, [from, to]) => result.replaceAll(from, to),
    source,
  );
}

async function rasterSvg(source, width, height) {
  return sharp(Buffer.from(source))
    .resize({ width, height, fit: "contain" })
    .png()
    .toBuffer();
}

async function loadBrandAssets() {
  const [logoSource, flameSource] = await Promise.all([
    fs.readFile(LOGO_PATH, "utf8"),
    fs.readFile(FLAME_PATH, "utf8"),
  ]);
  return {
    logoOriginal: logoSource,
    logoInverse: recolorSvg(logoSource, { [COLORS.green]: COLORS.cream }),
    flameOrange: flameSource,
    flameCream: recolorSvg(flameSource, { [COLORS.orange]: COLORS.cream }),
    flameBrown: recolorSvg(flameSource, { [COLORS.orange]: "#4A3211" }),
  };
}

async function writeAsset(name, buffer) {
  const masterPath = path.join(MASTER_ROOT, name);
  const publicPath = path.join(PUBLIC_ROOT, name);
  await Promise.all([fs.writeFile(masterPath, buffer), fs.writeFile(publicPath, buffer)]);
  return { masterPath, publicPath };
}

async function buildOgHome(brand) {
  const photo = await sharp(SQUARE_MASTER)
    .resize(720, 630, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.94, saturation: 0.96 })
    .png()
    .toBuffer();
  const logo = await rasterSvg(brand.logoInverse, 278);
  const overlay = svgCanvas(
    1200,
    630,
    `<defs>
      <linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="${COLORS.forest}"/><stop offset="0.43" stop-color="${COLORS.forest}" stop-opacity="0.98"/><stop offset="0.72" stop-color="${COLORS.forest}" stop-opacity="0.38"/><stop offset="1" stop-color="${COLORS.forest}" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#fade)"/>
    <rect x="76" y="210" width="56" height="4" rx="2" fill="${COLORS.gold}"/>
    <text x="76" y="298" fill="${COLORS.cream}" font-family="Arial, sans-serif" font-size="62" font-weight="700" letter-spacing="-1.8">Great food.</text>
    <text x="76" y="374" fill="${COLORS.cream}" font-family="Arial, sans-serif" font-size="62" font-weight="700" letter-spacing="-1.8">No menu.</text>
    <text x="76" y="450" fill="${COLORS.cream}" font-family="Arial, sans-serif" font-size="62" font-weight="700" letter-spacing="-1.8">No algorithm.</text>`,
  );
  const output = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: COLORS.forest },
  })
    .composite([
      { input: photo, left: 480, top: 0 },
      { input: overlay, left: 0, top: 0 },
      { input: logo, left: 76, top: 62 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return writeAsset("og-home-v3.png", output);
}

async function buildInstagram(brand) {
  const photo = await sharp(PORTRAIT_MASTER)
    .resize(1080, 1350, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.92, saturation: 0.98 })
    .png()
    .toBuffer();
  const logo = await rasterSvg(brand.logoInverse, 286);
  const overlay = svgCanvas(
    1080,
    1350,
    `<defs>
      <linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.forest}" stop-opacity="0.94"/><stop offset="0.72" stop-color="${COLORS.forest}" stop-opacity="0.38"/><stop offset="1" stop-color="${COLORS.forest}" stop-opacity="0"/></linearGradient>
      <linearGradient id="bottom" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${COLORS.forest}" stop-opacity="0.44"/><stop offset="1" stop-color="${COLORS.forest}" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="1080" height="590" fill="url(#top)"/>
    <rect y="1090" width="1080" height="260" fill="url(#bottom)"/>
    <text x="74" y="285" fill="${COLORS.orange}" font-family="Arial, sans-serif" font-size="132" font-weight="700" letter-spacing="-3">BAM!</text>
    <text x="78" y="372" fill="${COLORS.cream}" font-family="Nirmala UI, Arial, sans-serif" font-size="59" font-weight="600">${escapeXml("बड़ा ज़ायका,")}</text>
    <text x="78" y="447" fill="${COLORS.cream}" font-family="Nirmala UI, Arial, sans-serif" font-size="59" font-weight="600">${escapeXml("आएगा मज़ा")}</text>
    <rect x="78" y="484" width="84" height="5" rx="2.5" fill="${COLORS.gold}"/>`,
  );
  const output = await sharp(photo)
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: logo, left: 76, top: 66 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return writeAsset("instagram-cover-v3.png", output);
}

async function buildProfileAvatar(brand) {
  const flame = await rasterSvg(brand.flameOrange, 178, 178);
  const backdrop = svgCanvas(
    400,
    400,
    `<defs><radialGradient id="bg"><stop offset="0" stop-color="#236F49"/><stop offset="1" stop-color="${COLORS.forest}"/></radialGradient></defs>
    <rect width="400" height="400" fill="url(#bg)"/>
    <circle cx="200" cy="200" r="147" fill="${COLORS.cream}"/>
    <circle cx="200" cy="200" r="147" fill="none" stroke="${COLORS.gold}" stroke-width="8"/>`,
  );
  const output = await sharp(backdrop)
    .composite([{ input: flame, left: 111, top: 111 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return writeAsset("profile-avatar-v3.png", output);
}

async function buildWhatsappIcon(brand) {
  const flame = await rasterSvg(brand.flameCream, 210, 210);
  const backdrop = svgCanvas(
    500,
    500,
    `<defs><radialGradient id="bg"><stop offset="0" stop-color="#236F49"/><stop offset="1" stop-color="${COLORS.forest}"/></radialGradient></defs>
    <rect width="500" height="500" fill="${COLORS.cream}"/>
    <circle cx="250" cy="250" r="205" fill="url(#bg)"/>
    <circle cx="250" cy="250" r="205" fill="none" stroke="${COLORS.gold}" stroke-width="10"/>
    <circle cx="250" cy="250" r="151" fill="${COLORS.orange}"/>`,
  );
  const output = await sharp(backdrop)
    .composite([{ input: flame, left: 145, top: 145 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return writeAsset("whatsapp-icon-v3.png", output);
}

async function buildLinkedinBanner(brand, backgroundPath) {
  const resolved = path.resolve(ROOT, backgroundPath);
  await fs.access(resolved);
  await fs.copyFile(resolved, LINKEDIN_BACKGROUND_MASTER);
  const photo = await sharp(resolved)
    .resize(1584, 396, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.91, saturation: 0.94 })
    .png()
    .toBuffer();
  const [logo, bagLogo, bagFlame] = await Promise.all([
    rasterSvg(brand.logoInverse, 284),
    rasterSvg(brand.logoOriginal, 190),
    rasterSvg(brand.flameBrown, 30, 30),
  ]);
  const overlay = svgCanvas(
    1584,
    396,
    `<defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="${COLORS.forest}" stop-opacity="0.98"/><stop offset="0.56" stop-color="${COLORS.forest}" stop-opacity="0.88"/><stop offset="0.78" stop-color="${COLORS.forest}" stop-opacity="0.18"/><stop offset="1" stop-color="${COLORS.forest}" stop-opacity="0"/></linearGradient></defs>
    <rect width="1584" height="396" fill="url(#fade)"/>
    <text x="76" y="234" fill="${COLORS.cream}" font-family="Arial, sans-serif" font-size="47" font-weight="700" letter-spacing="-0.8">A customer-acquisition channel</text>
    <text x="76" y="292" fill="${COLORS.cream}" font-family="Arial, sans-serif" font-size="47" font-weight="700" letter-spacing="-0.8">for premium kitchens.</text>
    <rect x="76" y="327" width="96" height="4" rx="2" fill="${COLORS.gold}"/>`,
  );
  const output = await sharp(photo)
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: bagFlame, left: 1161, top: 42, blend: "multiply", opacity: 0.92 },
      { input: bagLogo, left: 1038, top: 205, blend: "multiply", opacity: 0.9 },
      { input: logo, left: 76, top: 54 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return writeAsset("linkedin-banner-v3.png", output);
}

async function writeReviewSheet(outputs) {
  const cards = outputs
    .map(
      ({ name }) => `<figure><img src="../../masters/social/${name}" alt="${name}"><figcaption>${name}</figcaption></figure>`,
    )
    .join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>goZaika social assets</title><style>body{margin:0;padding:28px;background:#fff8f0;color:#2d2d2d;font:15px/1.5 system-ui,sans-serif}h1{color:#1a5c38}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px}figure{margin:0;padding:12px;background:white;border:1px solid #eadfd4;border-radius:16px;box-shadow:0 8px 30px #1a5c3814}img{display:block;width:100%;height:auto;border-radius:10px}figcaption{padding:10px 2px 2px;font-weight:700}</style></head><body><h1>goZaika social assets</h1><p>Deterministic compositions from locked masters and canonical SVG brand geometry.</p><div class="grid">${cards}</div></body></html>`;
  await fs.writeFile(path.join(REVIEW_ROOT, "contact-sheet.html"), html, "utf8");
}

async function writeMetadata(outputs, linkedinBackground) {
  const metadata = {
    version: 1,
    status: linkedinBackground ? "complete-pending-review" : "deterministic-set-pending-review",
    generatedAt: new Date().toISOString(),
    canonicalBrandAssets: {
      logo: path.relative(ROOT, LOGO_PATH),
      bamFlameDrop: path.relative(ROOT, FLAME_PATH),
    },
    sourceMasters: {
      square: path.relative(ROOT, SQUARE_MASTER),
      portrait: path.relative(ROOT, PORTRAIT_MASTER),
      linkedinBackground: linkedinBackground
        ? path.relative(ROOT, LINKEDIN_BACKGROUND_MASTER)
        : null,
    },
    outputs: outputs.map(({ name, masterPath, publicPath }) => ({
      name,
      master: path.relative(ROOT, masterPath),
      public: path.relative(ROOT, publicPath),
    })),
    derivativeRule:
      "All copy and brand geometry are deterministic overlays. Image generation supplies only blank photographic backgrounds.",
  };
  await fs.writeFile(
    path.join(MASTER_ROOT, "social-master-system.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/gozaika-images/compose-social-assets.mjs [--linkedin-background <candidate.png>]");
    return;
  }
  await Promise.all([
    fs.mkdir(MASTER_ROOT, { recursive: true }),
    fs.mkdir(REVIEW_ROOT, { recursive: true }),
    fs.mkdir(PUBLIC_ROOT, { recursive: true }),
    fs.access(SQUARE_MASTER),
    fs.access(PORTRAIT_MASTER),
  ]);
  const brand = await loadBrandAssets();
  const results = await Promise.all([
    buildOgHome(brand),
    buildInstagram(brand),
    buildProfileAvatar(brand),
    buildWhatsappIcon(brand),
  ]);
  if (args.linkedinBackground) {
    results.push(await buildLinkedinBanner(brand, args.linkedinBackground));
  }
  const outputs = results.map((result) => ({
    name: path.basename(result.publicPath),
    ...result,
  }));
  await Promise.all([writeReviewSheet(outputs), writeMetadata(outputs, args.linkedinBackground)]);
  console.log(
    JSON.stringify(
      {
        outputs: outputs.map(({ publicPath }) => path.relative(ROOT, publicPath)),
        reviewSheet: path.relative(ROOT, path.join(REVIEW_ROOT, "contact-sheet.html")),
        linkedin: args.linkedinBackground ? "composed" : "awaiting selected generated background",
      },
      null,
      2,
    ),
  );
}

await main();
