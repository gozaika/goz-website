#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";

const root = process.cwd();
const artifactRoot = path.join(root, ".codex-artifacts", "gozaika-polish-v1");
const storeRaw = path.join(root, ".codex-artifacts", "gozaika-store-launch", "screenshots", "raw");
const videoRaw = path.join(root, ".codex-artifacts", "gozaika-marketing-videos", "screenshots");
const assetLib = "C:\\venkat\\limca\\gozaika\\marketing\\asset-library";

const colors = {
  cream: "#FFF8F0",
  forest: "#1A5C38",
  saffron: "#FF6B35",
  gold: "#D4A017",
  charcoal: "#2D2D2D",
  muted: "#6B7280",
  white: "#FFFFFF",
  partnerDeep: "#103E2A"
};

const storeScreens = {
  gozaika: {
    appName: "goZaika",
    audience: "Customer app",
    theme: "customer",
    rawDir: path.join(storeRaw, "gozaika"),
    outDir: path.join(artifactRoot, "store", "google-play", "gozaika"),
    logo: path.join(assetLib, "brand", "gozaika-logo.svg"),
    screenshots: [
      ["01-home-discover.png", "Discover chef-curated BAM Bags", "Hyderabad-first pickup-only food discoveries."],
      ["02-drops-list.png", "Browse active Limited Drops", "Cuisine, pickup window and dietary cues at a glance."],
      ["03-drop-detail.png", "Know before you claim", "Restaurant identity, allergens and pickup details stay clear."],
      ["04-order-confirmed.png", "Pickup confidence after checkout", "Your order is confirmed and the pickup code is sent securely."],
      ["05-passport.png", "Build your goZaika Passport", "Every discovery becomes part of your food story."]
    ]
  },
  "gozaika-partner": {
    appName: "goZaika Partner",
    audience: "Restaurant app",
    theme: "partner",
    rawDir: path.join(storeRaw, "gozaika-partner"),
    outDir: path.join(artifactRoot, "store", "google-play", "gozaika-partner"),
    logo: path.join(assetLib, "brand", "gozaika-logo-horizontal.svg"),
    screenshots: [
      ["01-pickup-counter.png", "Run pickup from one queue", "Ready orders, pickup windows and status are built for the counter."],
      ["02-verify-pickup.png", "Verify every handoff", "Use OTP or QR proof before marking the BAM Bag collected."],
      ["03-verify-otp-entered.png", "Counter checks stay simple", "The workflow is clear enough for a busy service window."],
      ["04-collected.png", "Collected orders update instantly", "Staff and owners see the operational state move forward."]
    ]
  }
};

const videoSets = {
  "customer-day-in-life": {
    title: "goZaika",
    subtitle: "A customer discovers, claims and picks up a BAM Bag.",
    theme: "customer",
    dir: path.join(videoRaw, "customer-day-in-life"),
    out: path.join(artifactRoot, "videos", "customer-day-in-life-social.webm"),
    frames: [
      ["customer-day-in-life-001.png", "Find today's off-menu BAM Bags nearby."],
      ["customer-day-in-life-002.png", "Browse Limited Drops by cuisine and pickup window."],
      ["customer-day-in-life-003.png", "See allergens, restaurant details and timing before you claim."],
      ["customer-day-in-life-004.png", "Reserve a Chef's Selection with a simulated beta checkout."],
      ["customer-day-in-life-005.png", "Pickup instructions stay clear after confirmation."],
      ["customer-day-in-life-006.png", "Every discovery builds your goZaika Passport."]
    ]
  },
  "restaurant-counter": {
    title: "goZaika Partner",
    subtitle: "A counter team verifies pickup in seconds.",
    theme: "partner",
    dir: path.join(videoRaw, "restaurant-counter"),
    out: path.join(artifactRoot, "videos", "restaurant-counter-social.webm"),
    frames: [
      ["restaurant-counter-001.png", "Pickup orders are organized for today's counter flow."],
      ["restaurant-counter-002.png", "Open the order and check the pickup-ready details."],
      ["restaurant-counter-003.png", "Verify the customer's proof before handoff."],
      ["restaurant-counter-004.png", "Collected orders update instantly."]
    ]
  },
  "restaurant-management": {
    title: "Restaurant Management",
    subtitle: "Owners see operations and performance in one workspace.",
    theme: "partner-wide",
    dir: path.join(videoRaw, "restaurant-management"),
    out: path.join(artifactRoot, "videos", "restaurant-management-social.webm"),
    frames: [
      ["restaurant-management-001.png", "Manage today's restaurant performance."],
      ["restaurant-management-002.png", "Track active Chef's Selections and pickup windows."],
      ["restaurant-management-003.png", "Review orders without exposing private customer data."],
      ["restaurant-management-004.png", "See pickup completion and sell-through clearly."],
      ["restaurant-management-005.png", "Turn off-menu discovery into measurable demand."]
    ]
  },
  "restaurant-onboarding": {
    title: "Restaurant Onboarding",
    subtitle: "Partner kitchens can prepare a brand-safe goZaika presence.",
    theme: "partner-wide",
    dir: path.join(videoRaw, "restaurant-onboarding"),
    out: path.join(artifactRoot, "videos", "restaurant-onboarding-social.webm"),
    frames: [
      ["restaurant-onboarding-001.png", "Start from a secure partner sign-in."],
      ["restaurant-onboarding-002.png", "Control how your kitchen appears on goZaika."],
      ["restaurant-onboarding-003.png", "Compliance and trust details are captured upfront."],
      ["restaurant-onboarding-004.png", "Private documents stay in the partner workflow."],
      ["restaurant-onboarding-005.png", "Create a brand-safe Chef's Selection."]
    ]
  }
};

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text, maxChars = 27) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function svgText({ width, height, title, subtitle, theme = "customer", small = false }) {
  const isPartner = theme.includes("partner");
  const titleColor = isPartner ? colors.cream : colors.white;
  const subColor = isPartner ? "#E9F4ED" : "#FFF3EA";
  const bg = isPartner ? colors.partnerDeep : colors.forest;
  const accent = isPartner ? colors.gold : colors.saffron;
  const titleLines = wrapText(title, small ? 26 : 25);
  const titleSize = small ? 44 : 52;
  const subSize = small ? 28 : 34;
  const titleSvg = titleLines
    .map((line, index) => `<text x="56" y="${(small ? 72 : 78) + index * (titleSize + 8)}" font-family="Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="800" fill="${titleColor}">${esc(line)}</text>`)
    .join("");
  const subtitleY = (small ? 124 : 132) + (titleLines.length - 1) * (titleSize + 8);
  return Buffer.from(`
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="${bg}"/>
    <circle cx="${width - 72}" cy="72" r="38" fill="${accent}" opacity="0.95"/>
    <rect x="0" y="${height - 8}" width="${Math.round(width * 0.42)}" height="8" rx="4" fill="${accent}"/>
    ${titleSvg}
    <text x="56" y="${subtitleY}" font-family="Inter, Arial, sans-serif" font-size="${subSize}" font-weight="500" fill="${subColor}">${esc(subtitle)}</text>
  </svg>`);
}

async function phoneCrop(input, width, height) {
  const meta = await sharp(input).metadata();
  const top = meta.height > 2100 ? 135 : 0;
  const cropHeight = Math.min(meta.height - top, Math.round((height / width) * meta.width));
  return sharp(input)
    .extract({ left: 0, top, width: meta.width, height: cropHeight })
    .resize(width, height, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
}

async function webCrop(input, width, height) {
  return sharp(input).resize(width, height, { fit: "cover", position: "top" }).png().toBuffer();
}

function roundedRectSvg(width, height, radius, fill, stroke = "none", strokeWidth = 0) {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${width - strokeWidth}" height="${height - strokeWidth}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/></svg>`);
}

async function makeStoreScreenshot(config, index, item) {
  const [file, title, subtitle] = item;
  const input = path.join(config.rawDir, file);
  const out = path.join(config.outDir, `${String(index + 1).padStart(2, "0")}-${path.basename(file)}`);
  const isPartner = config.theme === "partner";
  const W = 1080;
  const H = 1920;
  const bg = isPartner ? colors.partnerDeep : colors.forest;
  const headerH = 350;
  const footerH = 170;
  const phoneW = 650;
  const phoneH = 1445;
  const phoneX = Math.round((W - phoneW) / 2);
  const phoneY = 395;
  const screenshot = await phoneCrop(input, phoneW - 26, phoneH - 26);
  const base = sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: bg
    }
  });
  const header = svgText({ width: W, height: headerH, title, subtitle, theme: config.theme });
  const phoneShadow = roundedRectSvg(phoneW + 28, phoneH + 28, 78, "rgba(0,0,0,0.23)");
  const phoneOuter = roundedRectSvg(phoneW, phoneH, 70, "#111827");
  const phoneInner = roundedRectSvg(phoneW - 18, phoneH - 18, 58, colors.white);
  const footer = Buffer.from(`
  <svg width="${W}" height="${footerH}" viewBox="0 0 ${W} ${footerH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${footerH}" fill="${isPartner ? colors.forest : colors.cream}"/>
    <text x="54" y="66" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="${isPartner ? colors.cream : colors.forest}">${esc(config.appName)}</text>
    <text x="54" y="112" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500" fill="${isPartner ? "#D7E8DD" : colors.charcoal}">${esc(config.audience)} · Closed beta ready assets</text>
  </svg>`);

  await base
    .composite([
      { input: header, left: 0, top: 0 },
      { input: phoneShadow, left: phoneX - 14, top: phoneY + 10 },
      { input: phoneOuter, left: phoneX, top: phoneY },
      { input: phoneInner, left: phoneX + 9, top: phoneY + 9 },
      { input: screenshot, left: phoneX + 13, top: phoneY + 13 },
      { input: footer, left: 0, top: H - footerH }
    ])
    .png({ compressionLevel: 9 })
    .toFile(out);
  return out;
}

async function makeFeatureGraphic(appKey, config) {
  const W = 1024;
  const H = 500;
  const outDir = path.join(artifactRoot, "store", "google-play", "feature-graphics");
  await fs.mkdir(outDir, { recursive: true });
  const out = path.join(outDir, `${appKey}-feature-graphic-1024x500.png`);
  const hero = appKey === "gozaika"
    ? path.join(assetLib, "photography", "hero-square-master-2048.png")
    : path.join(assetLib, "photography", "restaurant-hero-master.png");
  const heroBuf = await sharp(hero).resize(500, H, { fit: "cover" }).png().toBuffer();
  const logoBuf = await sharp(config.logo).resize({ width: appKey === "gozaika" ? 210 : 280, height: 80, fit: "inside" }).png().toBuffer();
  const bg = appKey === "gozaika" ? colors.cream : colors.partnerDeep;
  const titleLines = appKey === "gozaika" ? ["BAM Bag", "discoveries"] : ["Pickup-ready", "partner tools"];
  const subtitleLines = appKey === "gozaika"
    ? ["Premium, pickup-only", "Chef's Selections."]
    : ["Counter verification,", "drops and reporting."];
  const titleSvg = titleLines.map((line, index) => `<text x="72" y="${190 + index * 56}" font-family="Inter, Arial, sans-serif" font-size="52" font-weight="850" fill="${appKey === "gozaika" ? colors.forest : colors.cream}">${esc(line)}</text>`).join("");
  const subtitleSvg = subtitleLines.map((line, index) => `<text x="72" y="${330 + index * 34}" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="500" fill="${appKey === "gozaika" ? colors.charcoal : "#D7E8DD"}">${esc(line)}</text>`).join("");
  const textSvg = Buffer.from(`
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#none)"/>
    <circle cx="80" cy="430" r="44" fill="${appKey === "gozaika" ? colors.saffron : colors.gold}" opacity="0.95"/>
    ${titleSvg}
    ${subtitleSvg}
    <text x="150" y="430" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="${appKey === "gozaika" ? colors.saffron : colors.gold}">gozaika.in</text>
  </svg>`);
  await sharp({ create: { width: W, height: H, channels: 4, background: bg } })
    .composite([
      { input: textSvg, left: 0, top: 0 },
      { input: logoBuf, left: 72, top: 64 },
      { input: heroBuf, left: 548, top: 0 }
    ])
    .png()
    .toFile(out);
  return out;
}

async function makeVideoScene(videoId, index, set, item) {
  const [file, caption] = item;
  const input = path.join(set.dir, file);
  const outDir = path.join(artifactRoot, "videos", "scenes", videoId);
  await fs.mkdir(outDir, { recursive: true });
  const out = path.join(outDir, `${String(index + 1).padStart(2, "0")}.png`);
  const W = 1080;
  const H = 1920;
  const isWide = set.theme === "partner-wide";
  const shotW = isWide ? 980 : 650;
  const shotH = isWide ? 620 : 1245;
  const shotX = Math.round((W - shotW) / 2);
  const shotY = isWide ? 600 : 420;
  const raw = isWide ? await webCrop(input, shotW, shotH) : await phoneCrop(input, shotW, shotH);
  const bg = set.theme.includes("partner") ? colors.partnerDeep : colors.forest;
  const header = svgText({
    width: W,
    height: 330,
    title: set.title,
    subtitle: set.subtitle,
    theme: set.theme.includes("partner") ? "partner" : "customer"
  });
  const captionSvg = Buffer.from(`
  <svg width="${W}" height="310" xmlns="http://www.w3.org/2000/svg">
    <rect x="54" y="30" width="${W - 108}" height="210" rx="32" fill="${colors.cream}"/>
    <rect x="54" y="30" width="12" height="210" rx="6" fill="${set.theme.includes("partner") ? colors.gold : colors.saffron}"/>
    <text x="98" y="112" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" fill="${colors.forest}">${esc(caption)}</text>
    <text x="98" y="170" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600" fill="${colors.muted}">${esc(index + 1)} / ${set.frames.length}</text>
  </svg>`);
  const frame = roundedRectSvg(shotW + 28, shotH + 28, isWide ? 36 : 70, "rgba(0,0,0,0.24)");
  const inner = roundedRectSvg(shotW + 10, shotH + 10, isWide ? 28 : 58, colors.white);
  await sharp({ create: { width: W, height: H, channels: 4, background: bg } })
    .composite([
      { input: header, left: 0, top: 0 },
      { input: frame, left: shotX - 14, top: shotY + 10 },
      { input: inner, left: shotX - 5, top: shotY - 5 },
      { input: raw, left: shotX, top: shotY },
      { input: captionSvg, left: 0, top: H - 360 }
    ])
    .png({ compressionLevel: 9 })
    .toFile(out);
  return out;
}

async function renderVideoWithPlaywright(videoId, scenePaths, output) {
  const htmlDir = path.join(artifactRoot, "videos", "_html");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.mkdir(htmlDir, { recursive: true });
  const html = path.join(htmlDir, `${videoId}.html`);
  const slides = scenePaths.map((p) => `<img class="slide" src="${pathToFileURL(p).href}">`).join("\n");
  await fs.writeFile(html, `<!doctype html>
<html><head><meta charset="utf-8"><style>
html, body { margin:0; width:1080px; height:1920px; overflow:hidden; background:#1A5C38; }
.slide { position:absolute; inset:0; width:1080px; height:1920px; object-fit:cover; opacity:0; transform:scale(1.018); animation: show ${scenePaths.length * 3}s linear forwards; }
${scenePaths.map((_, i) => `.slide:nth-child(${i + 1}) { animation-delay:${i * 3}s; }`).join("\n")}
@keyframes show {
  0% { opacity:0; transform:scale(1.035); }
  2.5% { opacity:1; transform:scale(1.018); }
  14.5% { opacity:1; transform:scale(1.000); }
  16.5% { opacity:0; transform:scale(0.996); }
  100% { opacity:0; }
}
</style></head><body>${slides}</body></html>`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: { dir: path.dirname(output), size: { width: 1080, height: 1920 } }
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(html).href);
  await page.waitForTimeout(scenePaths.length * 3000 + 700);
  const video = page.video();
  await context.close();
  await browser.close();
  const temp = await video.path();
  await fs.rename(temp, output);
}

async function writeReadme(manifest) {
  const readme = `# goZaika Polish v1

Generated: ${new Date().toISOString()}

This folder contains polished first-pass assets for store review and social/website previews. It uses the source-code capture package as input and does not modify raw capture artifacts.

## Outputs

- Google Play 9:16 screenshot masters: \`store/google-play/gozaika/\`, \`store/google-play/gozaika-partner/\`
- Google Play feature graphics: \`store/google-play/feature-graphics/\`
- Social preview videos: \`videos/*.webm\`
- Scene cards used to create videos: \`videos/scenes/\`

## Dev-Client Overlay Note

Some customer raw screenshots contain the Expo dev-client floating gear button. The compositions reduce its prominence by cropping the top app area and presenting the screen inside a branded phone frame. For final overlay-free assets, recapture from a preview or production build rather than a dev-client build.

Recommended future fix:

1. Link EAS projects and set preview/production env vars.
2. Build an Android preview or production APK/AAB for \`in.gozaika.customer\`.
3. Install that build on the Pixel 7 emulator or a real device.
4. Re-run \`npm.cmd run store:capture:screenshots -- --app gozaika --interactive\`.
5. Regenerate this polish package.

## ffmpeg Note

\`ffmpeg\` was not visible to this Codex PowerShell process while generating this package, so videos are WebM masters recorded through Chromium/Playwright. Once \`ffmpeg\` is visible on PATH, transcode with:

\`\`\`powershell
ffmpeg -i .codex-artifacts\\gozaika-polish-v1\\videos\\customer-day-in-life-social.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart .codex-artifacts\\gozaika-polish-v1\\videos\\customer-day-in-life-social.mp4
\`\`\`

## Manifest

See \`manifest.json\`.
`;
  await fs.writeFile(path.join(artifactRoot, "README.md"), readme);
  await fs.writeFile(path.join(artifactRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
}

async function main() {
  const manifest = { generatedAt: new Date().toISOString(), store: {}, videos: {}, notes: [] };
  await fs.mkdir(artifactRoot, { recursive: true });
  const fontCache = path.join(artifactRoot, "_font-cache");
  await fs.mkdir(fontCache, { recursive: true });
  process.env.FONTCONFIG_PATH = fontCache;
  process.env.XDG_CACHE_HOME = fontCache;
  for (const [key, config] of Object.entries(storeScreens)) {
    await fs.mkdir(config.outDir, { recursive: true });
    manifest.store[key] = [];
    for (let i = 0; i < config.screenshots.length; i++) {
      const out = await makeStoreScreenshot(config, i, config.screenshots[i]);
      manifest.store[key].push(path.relative(root, out));
    }
    const feature = await makeFeatureGraphic(key, config);
    manifest.store[`${key}FeatureGraphic`] = path.relative(root, feature);
  }
  for (const [videoId, set] of Object.entries(videoSets)) {
    const scenes = [];
    for (let i = 0; i < set.frames.length; i++) {
      scenes.push(await makeVideoScene(videoId, i, set, set.frames[i]));
    }
    await renderVideoWithPlaywright(videoId, scenes, set.out);
    manifest.videos[videoId] = {
      output: path.relative(root, set.out),
      scenes: scenes.map((p) => path.relative(root, p))
    };
  }
  manifest.notes.push("Customer raw screenshots include the Expo dev-client overlay; preview/production recapture removes it.");
  manifest.notes.push("WebM videos are first-cut social masters created from polished scene cards.");
  await writeReadme(manifest);
  console.log(`Wrote polish assets to ${artifactRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
