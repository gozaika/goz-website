// Generates goZaika cuisine-themed cover art (SVG sources + rasterized PNGs) for
// the consumer-mobile media fallbacks. The art is original flat-illustration work
// in the brand palette (saffron/forest/gold/cream); it is a much richer default
// than a single generic placeholder and is selected deterministically by name,
// so it is NOT demo-hardcoded and real uploaded media still takes priority.
//
// Run:  node scripts/demo-art/build-art.mjs
// Deps: sharp (already a workspace dependency of restaurant-mgmt-web).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const svgDir = join(__dirname, "svg");
const pngDir = join(repoRoot, "apps", "consumer-mobile", "assets", "art");

const W = 1200;
const H = 900;

const C = {
  cream: "#FFF8F0",
  saffron: "#FF6B35",
  forest: "#1A5C38",
  gold: "#D4A017",
  charcoal: "#2D2D2D",
  white: "#FFFFFF",
  teal: "#194B4A",
  ember: "#E2531F",
  leaf: "#3F8F5B",
  chili: "#C0392B",
};

// Small BAM flame-drop accent, bottom-right, ties every cover to the brand.
function flameMark(x, y, s = 1, fill = C.saffron) {
  return `<g transform="translate(${x},${y}) scale(${s})" opacity="0.9">
    <path d="M0,-46 C26,-20 30,8 12,30 C30,18 32,-6 18,-30 C40,-2 36,40 0,52 C-36,40 -40,-2 -18,-30 C-32,-6 -30,18 -12,30 C-30,8 -26,-20 0,-46 Z" fill="${fill}"/>
  </g>`;
}

function dots(cx, cy, r, n, spread, fill, op = 0.9) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i;
    const d = spread * (0.4 + ((i * 7) % 10) / 14);
    s += `<circle cx="${(cx + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d).toFixed(1)}" r="${r}" fill="${fill}" opacity="${op}"/>`;
  }
  return s;
}

function steam(cx, cy, fill = "#FFFFFF", op = 0.55) {
  return `<g opacity="${op}" fill="none" stroke="${fill}" stroke-width="10" stroke-linecap="round">
    <path d="M${cx - 60},${cy} c-18,-30 18,-50 0,-90 c-14,-26 14,-44 0,-78"/>
    <path d="M${cx},${cy} c-18,-34 18,-54 0,-100 c-14,-28 14,-48 0,-86"/>
    <path d="M${cx + 60},${cy} c-18,-30 18,-50 0,-90 c-14,-26 14,-44 0,-78"/>
  </g>`;
}

// Shared scene: cream backdrop, a soft accent "table" arc, a centered plate.
function scene(bg, band, motif, mark = C.saffron) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.cream}"/>
  <circle cx="${W / 2}" cy="${H + 120}" r="${H * 0.92}" fill="${bg}" opacity="0.10"/>
  <rect x="0" y="${H - 150}" width="${W}" height="150" fill="${band}" opacity="0.16"/>
  ${dots(150, 150, 9, 7, 120, band, 0.25)}
  ${dots(W - 150, 200, 9, 6, 110, mark, 0.22)}
  ${motif}
  ${flameMark(W - 120, H - 120, 0.9, mark)}
</svg>`;
}

const covers = {
  // Hyderabadi biryani — dark handi, fragrant rice, star anise, steam.
  biryani: () => {
    const cx = W / 2;
    const cy = 470;
    const motif = `
      ${steam(cx, 250, C.gold, 0.5)}
      <ellipse cx="${cx}" cy="${cy + 210}" rx="300" ry="46" fill="${C.charcoal}" opacity="0.12"/>
      <path d="M${cx - 250},${cy} a250,250 0 0 0 500,0 Z" fill="${C.charcoal}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="250" ry="70" fill="${C.charcoal}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="250" ry="70" fill="none" stroke="${C.gold}" stroke-width="10"/>
      <ellipse cx="${cx}" cy="${cy - 4}" rx="220" ry="56" fill="${C.cream}"/>
      <ellipse cx="${cx}" cy="${cy - 10}" rx="220" ry="56" fill="#FBE9C8"/>
      ${dots(cx, cy - 12, 7, 26, 200, C.saffron, 0.85)}
      ${dots(cx, cy - 12, 5, 14, 170, C.ember, 0.8)}
      <g transform="translate(${cx + 120},${cy - 40})" fill="${C.charcoal}" opacity="0.8">
        <circle r="20" fill="none" stroke="${C.charcoal}" stroke-width="6"/>
        ${dots(0, 0, 9, 8, 16, C.charcoal, 0.9)}
      </g>`;
    return scene(C.saffron, C.gold, motif, C.saffron);
  },

  // Pure-veg thali — steel plate, katoris of color, a fresh leaf.
  thali: () => {
    const cx = W / 2;
    const cy = 470;
    const bowls = [C.saffron, C.gold, C.forest, C.chili, C.ember];
    let katoris = "";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const bx = cx + Math.cos(a) * 190;
      const by = cy + Math.sin(a) * 150;
      katoris += `<ellipse cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" rx="62" ry="48" fill="#E7E9EC"/>
        <ellipse cx="${bx.toFixed(0)}" cy="${(by - 4).toFixed(0)}" rx="50" ry="38" fill="${bowls[i]}" opacity="0.92"/>`;
    }
    const motif = `
      <ellipse cx="${cx}" cy="${cy + 80}" rx="330" ry="120" fill="${C.charcoal}" opacity="0.10"/>
      <ellipse cx="${cx}" cy="${cy}" rx="330" ry="250" fill="#EDEFF2"/>
      <ellipse cx="${cx}" cy="${cy}" rx="330" ry="250" fill="none" stroke="#CED3D9" stroke-width="10"/>
      <ellipse cx="${cx}" cy="${cy}" rx="120" ry="92" fill="#FBE9C8"/>
      ${dots(cx, cy, 6, 12, 80, C.saffron, 0.7)}
      ${katoris}
      <g transform="translate(${cx - 250},${cy - 200}) rotate(-20)">
        <path d="M0,0 C40,-50 110,-50 150,0 C110,50 40,50 0,0 Z" fill="${C.leaf}"/>
        <path d="M10,0 L140,0" stroke="${C.forest}" stroke-width="5"/>
      </g>`;
    return scene(C.forest, C.leaf, motif, C.forest);
  },

  // Live-fire grill — skewers, embers, flame.
  grill: () => {
    const cx = W / 2;
    const cy = 500;
    let bars = "";
    for (let i = -2; i <= 2; i++) bars += `<rect x="${cx - 280}" y="${cy + i * 30}" width="560" height="10" rx="5" fill="${C.charcoal}" opacity="0.8"/>`;
    let skewer = (yy, color) => {
      let chunks = "";
      for (let i = 0; i < 5; i++) chunks += `<rect x="${cx - 180 + i * 78}" y="${yy - 26}" width="56" height="52" rx="20" fill="${color}"/>`;
      return `<rect x="${cx - 250}" y="${yy - 5}" width="500" height="10" rx="5" fill="#9AA0A6"/>${chunks}`;
    };
    const motif = `
      <g opacity="0.9">
        <path d="M${cx},${cy - 150} c50,40 50,90 18,120 c40,-14 54,-70 14,-118 c44,60 30,150 -32,176 c-62,-26 -76,-116 -32,-176 c-40,48 -26,104 14,118 c-32,-30 -32,-80 18,-120 Z" fill="${C.ember}"/>
        <path d="M${cx},${cy - 110} c30,26 30,58 10,78 c26,-10 34,-46 8,-78 c28,40 18,98 -20,116 c-38,-18 -48,-76 -20,-116 c-26,32 -16,68 10,78 c-20,-20 -20,-52 10,-78 Z" fill="${C.gold}"/>
      </g>
      ${bars}
      ${skewer(cy - 14, C.saffron)}
      ${skewer(cy + 50, C.chili)}
      ${dots(cx, cy + 120, 6, 16, 260, C.ember, 0.5)}`;
    return scene(C.ember, C.charcoal, motif, C.ember);
  },

  // Coastal Andhra — wave band, a fish, chili and curry leaves.
  coastal: () => {
    const cx = W / 2;
    const cy = 460;
    const motif = `
      <path d="M0,${cy + 150} q150,-60 300,0 t300,0 t300,0 t300,0 V${H} H0 Z" fill="${C.teal}" opacity="0.18"/>
      <g transform="translate(${cx},${cy})">
        <ellipse cx="0" cy="0" rx="240" ry="120" fill="${C.teal}"/>
        <ellipse cx="-40" cy="-12" rx="180" ry="86" fill="#2C6E6B"/>
        <path d="M210,0 l90,-70 v140 Z" fill="${C.teal}"/>
        <circle cx="-150" cy="-22" r="18" fill="${C.cream}"/>
        <circle cx="-150" cy="-22" r="9" fill="${C.charcoal}"/>
        ${dots(20, -10, 6, 10, 120, C.cream, 0.5)}
      </g>
      <g transform="translate(${cx - 300},${cy + 170}) rotate(18)">
        <path d="M0,0 q14,90 -10,150 q-22,-60 10,-150 Z" fill="${C.chili}"/>
        <path d="M0,0 q-10,-22 6,-34" stroke="${C.leaf}" stroke-width="8" fill="none"/>
      </g>
      <g transform="translate(${cx + 250},${cy + 150})">
        <path d="M0,0 C40,-44 100,-44 140,0 C100,44 40,44 0,0 Z" fill="${C.leaf}"/>
        <path d="M8,0 L132,0" stroke="${C.forest}" stroke-width="5"/>
      </g>`;
    return scene(C.teal, C.teal, motif, C.chili);
  },

  // Artisan bakery — croissant, cupcake, sprinkles.
  bakery: () => {
    const cx = W / 2;
    const cy = 470;
    const motif = `
      <ellipse cx="${cx}" cy="${cy + 150}" rx="320" ry="70" fill="${C.gold}" opacity="0.10"/>
      <g transform="translate(${cx - 150},${cy})">
        <path d="M-170,40 C-120,-70 120,-70 170,40 C90,10 -90,10 -170,40 Z" fill="${C.gold}"/>
        <path d="M-170,40 C-120,-44 120,-44 170,40" fill="none" stroke="#B8860B" stroke-width="8"/>
        <path d="M-110,18 q0,-40 40,-46 M-40,8 q0,-46 40,-50 M30,8 q0,-44 44,-46" stroke="#B8860B" stroke-width="7" fill="none"/>
      </g>
      <g transform="translate(${cx + 210},${cy + 10})">
        <path d="M-70,0 L70,0 L48,150 L-48,150 Z" fill="#E8C39E"/>
        <path d="M-70,0 L70,0 L66,26 L-66,26 Z" fill="#D9A86C"/>
        <path d="M-86,4 C-86,-90 86,-90 86,4 C40,-26 -40,-26 -86,4 Z" fill="${C.saffron}"/>
        <circle cx="0" cy="-70" r="16" fill="${C.chili}"/>
        ${dots(0, -30, 5, 9, 70, C.white, 0.95)}
      </g>
      ${dots(cx - 30, cy - 200, 6, 12, 170, C.gold, 0.6)}`;
    return scene(C.gold, C.gold, motif, C.gold);
  },
};

async function main() {
  await mkdir(svgDir, { recursive: true });
  await mkdir(pngDir, { recursive: true });
  const names = Object.keys(covers);
  for (const name of names) {
    const svg = covers[name]();
    const svgPath = join(svgDir, `cover-${name}.svg`);
    const pngPath = join(pngDir, `cover-${name}.png`);
    await writeFile(svgPath, svg, "utf8");
    await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(pngPath);
    console.log(`✓ cover-${name}  (svg + png)`);
  }
  console.log(`\nWrote ${names.length} covers to ${pngDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
