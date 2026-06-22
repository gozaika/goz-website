import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "output", "marketing", "restaurant-sales-kit", "assets");
await fs.mkdir(OUT, { recursive: true });

const logo = await fs.readFile(path.join(ROOT, "icons", "gozaika-logo.svg"));
const logoWhite = await fs.readFile(path.join(ROOT, "apps", "website", "public", "logos", "gozaika-logo-white.svg"));
const mark = await fs.readFile(path.join(ROOT, "icons", "flame.svg"));
const hero = path.join(ROOT, ".codex-artifacts", "gozaika-images", "masters", "restaurant", "restaurant-hero-master.png");
const portrait = path.join(ROOT, ".codex-artifacts", "gozaika-images", "masters", "portrait", "hero-portrait-master.png");
const square = path.join(ROOT, ".codex-artifacts", "gozaika-images", "masters", "square", "hero-square-master-2048.png");
const culture = path.join(ROOT, ".codex-artifacts", "gozaika-images", "masters", "about", "about-culture-master.png");

await Promise.all([
  sharp(logo).resize({ width: 1200 }).png().toFile(path.join(OUT, "gozaika-logo.png")),
  sharp(logoWhite).resize({ width: 1200 }).png().toFile(path.join(OUT, "gozaika-logo-white.png")),
  sharp(mark).resize({ width: 512, height: 512, fit: "contain" }).png().toFile(path.join(OUT, "bam-flame-drop.png")),
  sharp(hero).resize(1800, 1120, { fit: "cover", position: "attention" }).png().toFile(path.join(OUT, "restaurant-hero-crop.png")),
  sharp(hero).resize(1800, 1120, { fit: "cover", position: "attention" }).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(path.join(OUT, "restaurant-hero-crop.jpg")),
  sharp(hero).resize(1280, 1440, { fit: "cover", position: "attention" }).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(path.join(OUT, "deck-restaurant.jpg")),
  sharp(portrait).resize(720, 1040, { fit: "cover", position: "attention" }).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(path.join(OUT, "deck-portrait.jpg")),
  sharp(square).resize(1048, 1440, { fit: "cover", position: "attention" }).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(path.join(OUT, "deck-square.jpg")),
  sharp(culture).resize(984, 1440, { fit: "cover", position: "attention" }).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(path.join(OUT, "deck-culture.jpg")),
]);

console.log(path.relative(ROOT, OUT));
