import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const REVIEW_ROOT = path.join(ROOT, ".codex-artifacts", "gozaika-mobile-identity", "review");
const MARK_SOURCE = path.join(ROOT, "icons", "flame.svg");
const LOGO_COLOR_SOURCE = path.join(ROOT, "icons", "gozaika-logo.svg");
const LOGO_WHITE_SOURCE = path.join(ROOT, "apps", "website", "public", "logos", "gozaika-logo-white.svg");

const COLORS = {
  cream: "#FFF8F0",
  saffron: "#FF6B35",
  forest: "#1A5C38",
  teal: "#194B4A",
  charcoal: "#2D2D2D",
  white: "#FFFFFF",
};

const candidates = [
  { id: "customer-c1", label: "Customer C1 · preferred", background: COLORS.cream, mark: COLORS.saffron },
  { id: "customer-c2", label: "Customer C2", background: COLORS.saffron, mark: COLORS.cream },
  { id: "customer-c3", label: "Customer C3", background: COLORS.cream, mark: COLORS.forest },
  { id: "partner-p1", label: "Partner P1 · preferred", background: COLORS.forest, mark: COLORS.cream },
  { id: "partner-p2", label: "Partner P2", background: COLORS.forest, mark: COLORS.saffron },
  { id: "partner-p3", label: "Partner P3", background: COLORS.teal, mark: COLORS.cream },
];

function recolorSvg(source, from, to) {
  return source.replaceAll(from, to);
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function renderMark(markSvg, color, width) {
  return sharp(Buffer.from(recolorSvg(markSvg, "#FF6B35", color)))
    .resize({ width, height: width, fit: "contain" })
    .png()
    .toBuffer();
}

async function renderCandidate(markSvg, candidate, size = 1024, markWidth = 590) {
  const mark = await renderMark(markSvg, candidate.mark, markWidth);
  const offset = Math.round((size - markWidth) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: candidate.background },
  })
    .composite([{ input: mark, left: offset, top: offset + Math.round(size * 0.012) }])
    .png()
    .toBuffer();
}

function maskSvg(kind, size) {
  if (kind === "circle") return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`;
  if (kind === "squircle") {
    const inset = size * 0.04;
    return `<svg width="${size}" height="${size}"><rect x="${inset}" y="${inset}" width="${size - 2 * inset}" height="${size - 2 * inset}" rx="${size * 0.25}" fill="#fff"/></svg>`;
  }
  return `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.14}" fill="#fff"/></svg>`;
}

async function maskedPreview(icon, kind, size = 260) {
  const resized = await sharp(icon).resize(size, size).png().toBuffer();
  return sharp(resized).composite([{ input: Buffer.from(maskSvg(kind, size)), blend: "dest-in" }]).png().toBuffer();
}

async function buildReview() {
  await fs.mkdir(REVIEW_ROOT, { recursive: true });
  const markSvg = await fs.readFile(MARK_SOURCE, "utf8");
  const outputs = new Map();

  for (const candidate of candidates) {
    const icon = await renderCandidate(markSvg, candidate);
    outputs.set(candidate.id, icon);
    await fs.writeFile(path.join(REVIEW_ROOT, `${candidate.id}.png`), icon);
  }

  const sheetWidth = 1800;
  const sheetHeight = 1540;
  const cardWidth = 540;
  const cardHeight = 650;
  const lefts = [90, 630, 1170];
  const tops = [170, 835];
  const layers = [];

  const header = `<svg width="${sheetWidth}" height="150">
    <rect width="100%" height="100%" fill="#FFF8F0"/>
    <text x="90" y="65" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#1A5C38">goZaika mobile identity review</text>
    <text x="90" y="110" font-family="Arial, sans-serif" font-size="22" fill="#2D2D2D">Exact BAM flame-drop geometry · unmasked source + platform masks + 48/32 px tests</text>
  </svg>`;
  layers.push({ input: Buffer.from(header), left: 0, top: 0 });

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const x = lefts[index % 3];
    const y = tops[Math.floor(index / 3)];
    const icon = outputs.get(candidate.id);
    const unmasked = await sharp(icon).resize(260, 260).png().toBuffer();
    const circle = await maskedPreview(icon, "circle");
    const squircle = await maskedPreview(icon, "squircle");
    const small48 = await sharp(icon).resize(48, 48).png().toBuffer();
    const small32 = await sharp(icon).resize(32, 32).png().toBuffer();
    const card = `<svg width="${cardWidth}" height="${cardHeight}">
      <rect x="1" y="1" width="${cardWidth - 2}" height="${cardHeight - 2}" rx="24" fill="#FFFFFF" stroke="#E5D8C8" stroke-width="2"/>
      <text x="28" y="48" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#1A5C38">${escapeXml(candidate.label)}</text>
      <text x="28" y="615" font-family="Arial, sans-serif" font-size="18" fill="#6B7280">field ${candidate.background} · mark ${candidate.mark}</text>
    </svg>`;
    layers.push({ input: Buffer.from(card), left: x, top: y });
    layers.push({ input: unmasked, left: x + 28, top: y + 80 });
    layers.push({ input: circle, left: x + 298, top: y + 80 });
    layers.push({ input: squircle, left: x + 28, top: y + 350 });
    layers.push({ input: small48, left: x + 330, top: y + 405 });
    layers.push({ input: small32, left: x + 410, top: y + 413 });
    const labels = `<svg width="240" height="100">
      <text x="0" y="24" font-family="Arial, sans-serif" font-size="16" fill="#2D2D2D">48 px</text>
      <text x="80" y="24" font-family="Arial, sans-serif" font-size="16" fill="#2D2D2D">32 px</text>
    </svg>`;
    layers.push({ input: Buffer.from(labels), left: x + 330, top: y + 465 });
  }

  const sheet = await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 4, background: COLORS.cream } })
    .composite(layers)
    .png()
    .toBuffer();
  await fs.writeFile(path.join(REVIEW_ROOT, "mobile-identity-contact-sheet.png"), sheet);

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    canonicalMark: path.relative(ROOT, MARK_SOURCE),
    candidates,
    recommended: { customer: "customer-c1", partner: "partner-p1" },
    rationale: "Maximum family coherence and app distinguishability; opaque universal fields; exact BAM geometry; no baked corner mask.",
  };
  await fs.writeFile(path.join(REVIEW_ROOT, "review-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(path.relative(ROOT, path.join(REVIEW_ROOT, "mobile-identity-contact-sheet.png")));
}

async function renderUniversal(markSvg, background, markColor) {
  const mark = await renderMark(markSvg, markColor, 1180);
  return sharp({ create: { width: 2048, height: 2048, channels: 3, background } })
    .composite([{ input: mark, left: 434, top: 459 }])
    .png()
    .toBuffer();
}

async function renderAdaptive(markSvg, markColor) {
  const mark = await renderMark(markSvg, markColor, 1120);
  return sharp({ create: { width: 2048, height: 2048, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, left: 464, top: 489 }])
    .png()
    .toBuffer();
}

async function renderSplash(logoSvg) {
  const logo = await sharp(Buffer.from(logoSvg)).resize({ width: 1100, fit: "contain" }).png().toBuffer();
  const metadata = await sharp(logo).metadata();
  return sharp({ create: { width: 2048, height: 2048, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, left: Math.round((2048 - metadata.width) / 2), top: Math.round((2048 - metadata.height) / 2) }])
    .png()
    .toBuffer();
}

async function applyFinals() {
  const markSvg = await fs.readFile(MARK_SOURCE, "utf8");
  const logoColor = await fs.readFile(LOGO_COLOR_SOURCE, "utf8");
  const logoWhite = await fs.readFile(LOGO_WHITE_SOURCE, "utf8");
  const customerRoot = path.join(ROOT, "apps", "consumer-mobile", "assets");
  const partnerRoot = path.join(ROOT, "apps", "restaurant-mobile", "assets");

  const finalAssets = [
    [path.join(customerRoot, "icon.png"), await renderUniversal(markSvg, COLORS.cream, COLORS.saffron)],
    [path.join(customerRoot, "adaptive-icon.png"), await renderAdaptive(markSvg, COLORS.saffron)],
    [path.join(customerRoot, "splash-icon.png"), await renderSplash(logoColor)],
    [path.join(partnerRoot, "icon.png"), await renderUniversal(markSvg, COLORS.forest, COLORS.cream)],
    [path.join(partnerRoot, "adaptive-icon.png"), await renderAdaptive(markSvg, COLORS.cream)],
    [path.join(partnerRoot, "splash-icon.png"), await renderSplash(logoWhite)],
  ];

  const notification = await renderMark(markSvg, COLORS.white, 72);
  const notificationCanvas = await sharp({ create: { width: 96, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: notification, left: 12, top: 12 }])
    .png()
    .toBuffer();
  finalAssets.push([path.join(customerRoot, "notification-icon.png"), notificationCanvas]);
  finalAssets.push([path.join(partnerRoot, "notification-icon.png"), notificationCanvas]);

  const monochromePng = await renderAdaptive(markSvg, "#000000");
  finalAssets.push([path.join(customerRoot, "monochrome-icon.png"), monochromePng]);
  finalAssets.push([path.join(partnerRoot, "monochrome-icon.png"), monochromePng]);

  for (const [destination, contents] of finalAssets) await fs.writeFile(destination, contents);

  const monochrome = recolorSvg(markSvg, "#FF6B35", "#000000");
  await fs.writeFile(path.join(customerRoot, "monochrome-icon.svg"), monochrome, "utf8");
  await fs.writeFile(path.join(partnerRoot, "monochrome-icon.svg"), monochrome, "utf8");
  console.log("Applied final mobile identity assets.");
}

const mode = process.argv.includes("--apply") ? "apply" : "review";
if (mode === "apply") await applyFinals();
else await buildReview();
