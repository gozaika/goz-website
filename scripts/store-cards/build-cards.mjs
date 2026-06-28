// goZaika store-listing card builder.
//
// Composes App Store / Play screenshot cards from REAL native app screenshots
// per the locked design system in
// `.codex-artifacts/gozaika-polish-v2/02-design-system/store_video_design_system_lock_v1.md`
// and the wireframes in `03-wireframes/`.
//
// - Canvas: 1080 x 1920 (Android phone portrait master). Safe zones: 96px L/R,
//   120px top, 180px bottom kept clear of critical text.
// - Real screenshots only for UI; we crop device chrome (status bar / gesture nav)
//   but never edit in-app price/dish/restaurant/allergen/order/pickup text.
// - Palette + type scale from the design-system lock. Type uses a production-safe
//   sans stack (Inter where installed, else Segoe UI / system-ui) — final marketing
//   typography is an open brand decision.
//
// Run:  node scripts/store-cards/build-cards.mjs
// Deps: playwright (already a workspace dependency). Reads source PNGs from
//   store-assets/screenshots/<app>/, writes cards to store-assets/cards/<app>/.

import { readFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const shotsRoot = join(repoRoot, "store-assets", "screenshots");
const cardsRoot = join(repoRoot, "store-assets", "cards");

const W = 1080;
const H = 1920;

const C = {
  saffron: "#FF6B35",
  saffronLight: "#FFF0E8",
  forest: "#1A5C38",
  forestLight: "#EAF3DE",
  gold: "#D4A017",
  cream: "#FFF8F0",
  charcoal: "#2D2D2D",
  white: "#FFFFFF",
  teal: "#194B4A",
};

const FONT = `'Inter','Segoe UI',system-ui,-apple-system,sans-serif`;

async function dataUri(absPath) {
  const buf = await readFile(absPath);
  const ext = extname(absPath).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,${buf.toString("base64")}`;
}

// A soft brand background. `tone` = "warm" (customer) | "trust" (forest) |
// "habit" (gold) | "partner" (forest/teal operational).
function background(tone) {
  if (tone === "trust") {
    return `radial-gradient(120% 90% at 18% 8%, ${C.forestLight} 0%, ${C.cream} 46%, #FBEFDD 100%)`;
  }
  if (tone === "habit") {
    return `radial-gradient(120% 90% at 82% 10%, #FBEDC9 0%, ${C.cream} 50%, ${C.saffronLight} 100%)`;
  }
  if (tone === "partner") {
    return `radial-gradient(125% 95% at 16% 6%, ${C.forestLight} 0%, ${C.cream} 50%, #E7EEDF 100%)`;
  }
  // warm (default customer)
  return `radial-gradient(125% 95% at 16% 6%, ${C.saffronLight} 0%, ${C.cream} 52%, #FCEFE0 100%)`;
}

function flameSvg(fill = C.saffron, size = 54) {
  return `<svg width="${size}" height="${size}" viewBox="-60 -60 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,-46 C26,-20 30,8 12,30 C30,18 32,-6 18,-30 C40,-2 36,40 0,52 C-36,40 -40,-2 -18,-30 C-32,-6 -30,18 -12,30 C-30,8 -26,-20 0,-46 Z" fill="${fill}"/>
  </svg>`;
}

function badgePill(label, kind = "saffron") {
  const map = {
    saffron: `background:${C.saffron};color:#fff;`,
    forest: `background:${C.forest};color:#fff;`,
    gold: `background:${C.gold};color:${C.charcoal};`,
    cream: `background:#fff;color:${C.charcoal};border:2px solid rgba(0,0,0,.08);`,
  };
  return `<span style="display:inline-flex;align-items:center;gap:10px;${map[kind]};
    font:700 26px/1.2 ${FONT};padding:14px 26px;border-radius:999px;letter-spacing:.2px;
    box-shadow:0 8px 22px rgba(0,0,0,.10)">${label}</span>`;
}

// A device-framed screenshot. `crop` trims source device chrome (status bar / gesture nav).
function deviceFrame({ src, crop = {}, rotate = 0, scale = 1, maxH = 1180 }) {
  const { top = 0, bottom = 0, left = 0, right = 0 } = crop;
  // The image is shown inside a rounded mask; negative offsets clip chrome.
  return `<div style="transform:rotate(${rotate}deg) scale(${scale});transform-origin:center;
      filter:drop-shadow(0 34px 60px rgba(45,45,45,.28));">
    <div style="border-radius:54px;overflow:hidden;background:#000;border:10px solid #15110e;
        max-height:${maxH}px;display:inline-block;line-height:0;">
      <div style="overflow:hidden;width:${1080 - left - right}px;">
        <img src="${src}" style="display:block;width:${1080}px;margin:${-top}px 0 ${-bottom}px ${-left}px;"/>
      </div>
    </div>
  </div>`;
}

// Editorial "proof crop" panel that escapes the device frame (magnified real UI).
function proofPanel({ src, crop = {}, w = 560, label, labelKind = "gold" }) {
  const { top = 0, bottom = 0, left = 0, right = 0, srcW = 1080 } = crop;
  const renderW = w;
  const k = renderW / (srcW - left - right);
  return `<div style="position:relative;">
    <div style="border-radius:28px;overflow:hidden;background:#fff;border:1px solid rgba(0,0,0,.08);
        box-shadow:0 22px 44px rgba(45,45,45,.20);width:${renderW}px;">
      <div style="overflow:hidden;width:${renderW}px;">
        <img src="${src}" style="display:block;width:${1080 * k}px;margin:${-top * k}px 0 ${-bottom * k}px ${-left * k}px;"/>
      </div>
    </div>
    ${label ? `<div style="position:absolute;left:-18px;top:-22px;">${badgePill(label, labelKind)}</div>` : ""}
  </div>`;
}

function headerBlock({ kicker, headline, sub, kickerColor = C.saffron }) {
  return `
    ${kicker ? `<div style="display:flex;align-items:center;gap:18px;margin-bottom:22px;">
      ${flameSvg(kickerColor, 48)}
      <span style="font:800 28px/1 ${FONT};letter-spacing:3px;text-transform:uppercase;color:${kickerColor}">${kicker}</span>
    </div>` : ""}
    <h1 style="margin:0;font:800 70px/1.08 ${FONT};color:${C.charcoal};letter-spacing:-.5px;">${headline}</h1>
    ${sub ? `<p style="margin:22px 0 0;font:560 34px/1.3 ${FONT};color:rgba(45,45,45,.74);max-width:880px;">${sub}</p>` : ""}
  `;
}

// Card layouts -------------------------------------------------------------

async function layoutHeroTop(card) {
  // Header at top, large tilted device below, badge cluster overlapping.
  const src = await dataUri(join(shotsRoot, card.app, card.shot));
  return `
  <div style="position:absolute;left:96px;right:96px;top:120px;">
    ${headerBlock(card)}
  </div>
  <div style="position:absolute;left:0;right:0;top:${card.deviceTop ?? 560}px;display:flex;justify-content:center;">
    ${deviceFrame({ src, crop: card.crop, rotate: card.rotate ?? -2.2, scale: card.scale ?? 0.86, maxH: card.maxH ?? 1240 })}
  </div>
  ${card.badges ? `<div style="position:absolute;left:96px;bottom:210px;display:flex;gap:18px;flex-wrap:wrap;">
    ${card.badges.map((b) => badgePill(b.label, b.kind)).join("")}
  </div>` : ""}`;
}

async function layoutProofRight(card) {
  // Header top-left, device on one side, magnified proof crop escaping the frame.
  const src = await dataUri(join(shotsRoot, card.app, card.shot));
  return `
  <div style="position:absolute;left:96px;right:96px;top:120px;">
    ${headerBlock(card)}
  </div>
  <div style="position:absolute;left:-70px;top:600px;">
    ${deviceFrame({ src, crop: card.crop, rotate: card.rotate ?? -3, scale: card.scale ?? 0.74, maxH: 1180 })}
  </div>
  ${card.proof ? `<div style="position:absolute;right:70px;top:${card.proofTop ?? 980}px;">
    ${proofPanel({ src, crop: card.proof.crop, w: card.proof.w ?? 540, label: card.proof.label, labelKind: card.proof.labelKind })}
  </div>` : ""}
  ${card.badges ? `<div style="position:absolute;left:96px;bottom:200px;display:flex;gap:18px;flex-wrap:wrap;">
    ${card.badges.map((b) => badgePill(b.label, b.kind)).join("")}
  </div>` : ""}`;
}

async function layoutFinalTrio(card) {
  // Brand payoff: logo/flame + headline, three real proof tiles, CTA text.
  const tiles = await Promise.all(card.tiles.map(async (t) => {
    const src = await dataUri(join(shotsRoot, card.app, t.shot));
    return proofPanel({ src, crop: t.crop, w: 280, label: t.label, labelKind: t.labelKind ?? "forest" });
  }));
  return `
  <div style="position:absolute;left:96px;right:96px;top:150px;text-align:center;display:flex;flex-direction:column;align-items:center;">
    ${flameSvg(C.saffron, 92)}
    <div style="font:800 60px/1 ${FONT};color:${C.charcoal};letter-spacing:1px;margin-top:10px;">go<span style="color:${C.saffron}">Z</span>aika${card.brandSuffix ? `<span style="color:${C.forest};font-weight:700;"> ${card.brandSuffix}</span>` : ""}</div>
    <h1 style="margin:34px 0 0;font:800 64px/1.1 ${FONT};color:${C.charcoal};max-width:900px;">${card.headline}</h1>
    ${card.sub ? `<p style="margin:20px 0 0;font:560 32px/1.3 ${FONT};color:rgba(45,45,45,.72);max-width:820px;">${card.sub}</p>` : ""}
  </div>
  <div style="position:absolute;left:0;right:0;top:880px;display:flex;justify-content:center;gap:34px;">
    ${tiles.map((t, i) => `<div style="transform:translateY(${i === 1 ? -28 : 0}px);">${t}</div>`).join("")}
  </div>
  <div style="position:absolute;left:0;right:0;bottom:230px;text-align:center;">
    <span style="font:800 40px/1 ${FONT};color:${C.forest};">${card.cta ?? "Download goZaika"}</span>
  </div>`;
}

const LAYOUTS = { heroTop: layoutHeroTop, proofRight: layoutProofRight, finalTrio: layoutFinalTrio };

async function renderCard(page, card) {
  const inner = await LAYOUTS[card.layout](card);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;}
    html,body{width:${W}px;height:${H}px;}
    #card{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${background(card.tone)};}
  </style></head><body><div id="card">${inner}</div></body></html>`;
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(120);
  const el = await page.$("#card");
  const outDir = join(cardsRoot, card.app);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${card.id}.png`);
  await el.screenshot({ path: outPath });
  return outPath;
}

async function main() {
  const { CARDS } = await import("./cards.config.mjs");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  let made = 0;
  for (const card of CARDS) {
    const required = card.tiles ? card.tiles.map((t) => t.shot) : [card.shot];
    const missing = required.filter((s) => !existsSync(join(shotsRoot, card.app, s)));
    if (missing.length) {
      console.log(`- skip ${card.id}: missing screenshot(s) ${missing.join(", ")}`);
      continue;
    }
    const out = await renderCard(page, card);
    made++;
    console.log(`✓ ${card.app}/${card.id} → ${out}`);
  }
  await browser.close();
  console.log(`\nBuilt ${made} card(s) → ${cardsRoot}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
