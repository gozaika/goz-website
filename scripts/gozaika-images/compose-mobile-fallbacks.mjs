import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const MARK_PATH = path.join(ROOT, "icons", "flame.svg");
const destinations = [
  path.join(ROOT, "apps", "consumer-mobile", "assets"),
  path.join(ROOT, "apps", "restaurant-mobile", "assets"),
];

const palette = {
  cream: "#FFF8F0",
  saffron: "#FF6B35",
  forest: "#1A5C38",
  gold: "#D4A017",
  kraft: "#C99A62",
  kraftLight: "#E5C79F",
};

async function markBuffer(width) {
  const source = await fs.readFile(MARK_PATH);
  return sharp(source).resize({ width, height: width, fit: "contain" }).png().toBuffer();
}

async function makeDropFallback() {
  const width = 1200;
  const height = 900;
  const mark = await markBuffer(128);
  const art = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="${palette.cream}"/>
    <circle cx="1040" cy="120" r="310" fill="${palette.saffron}" opacity="0.07"/>
    <circle cx="120" cy="820" r="250" fill="${palette.forest}" opacity="0.06"/>
    <path d="M340 244 L860 244 L824 744 Q600 800 376 744 Z" fill="${palette.kraft}"/>
    <path d="M340 244 L440 164 H760 L860 244 Z" fill="${palette.kraftLight}"/>
    <rect x="520" y="176" width="160" height="56" rx="8" fill="${palette.gold}"/>
    <path d="M410 362 Q600 316 790 362" fill="none" stroke="${palette.forest}" stroke-width="8" opacity="0.18"/>
    <path d="M430 610 Q600 656 770 610" fill="none" stroke="${palette.forest}" stroke-width="8" opacity="0.12"/>
  </svg>`;
  return sharp(Buffer.from(art))
    .composite([{ input: mark, left: 536, top: 406 }])
    .png()
    .toBuffer();
}

async function makeRestaurantFallback() {
  const width = 1600;
  const height = 900;
  const art = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${palette.forest}"/>
        <stop offset="1" stop-color="#194B4A"/>
      </linearGradient>
      <linearGradient id="table" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#E8D4B8"/>
        <stop offset="1" stop-color="${palette.kraft}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#field)"/>
    <circle cx="1260" cy="100" r="360" fill="${palette.gold}" opacity="0.12"/>
    <path d="M0 620 Q400 540 800 620 T1600 620 V900 H0 Z" fill="url(#table)"/>
    <path d="M0 636 Q400 556 800 636 T1600 636" fill="none" stroke="${palette.gold}" stroke-width="10" opacity="0.62"/>
    <g fill="none" stroke="${palette.cream}" stroke-width="14" stroke-linecap="round" opacity="0.34">
      <path d="M230 250 Q310 172 390 250 Q310 330 230 250Z"/>
      <path d="M430 180 Q510 102 590 180 Q510 260 430 180Z"/>
      <path d="M1050 320 Q1130 242 1210 320 Q1130 400 1050 320Z"/>
    </g>
    <circle cx="800" cy="612" r="148" fill="${palette.cream}" opacity="0.10"/>
    <circle cx="800" cy="612" r="94" fill="none" stroke="${palette.gold}" stroke-width="8" opacity="0.55"/>
  </svg>`;
  return sharp(Buffer.from(art)).png().toBuffer();
}

const [drop, restaurant] = await Promise.all([makeDropFallback(), makeRestaurantFallback()]);
for (const destination of destinations) {
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, "drop-default.png"), drop);
  await fs.writeFile(path.join(destination, "restaurant-cover-default.png"), restaurant);
}
console.log("Composed truthful mobile fallback assets for both apps.");
