import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SOURCE = path.join(ROOT, "marketing-source", "restaurant-sales-kit");
const ASSETS = path.join(ROOT, "output", "marketing", "restaurant-sales-kit", "assets");
const OUTPUT = path.join(ROOT, "output", "marketing", "restaurant-sales-kit", "digital");
await fs.mkdir(OUTPUT, { recursive: true });

const copy = JSON.parse(await fs.readFile(path.join(SOURCE, "copy", "en-v1.json"), "utf8"));
const logo = await sharp(path.join(ASSETS, "gozaika-logo.png")).resize({ width: 360 }).png().toBuffer();
const hero = await sharp(path.join(ASSETS, "restaurant-hero-crop.jpg")).resize(920, 430, { fit: "cover", position: "attention" }).png().toBuffer();

const canvas = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="#FFF8F0"/>
  <text x="880" y="98" text-anchor="end" font-family="Arial" font-size="24" font-weight="700" fill="#1A5C38">RESTAURANT PARTNER</text>
  <text x="80" y="230" font-family="Georgia" font-size="68" font-weight="700" fill="#1A5C38">
    <tspan x="80" dy="0">Bring new guests</tspan>
    <tspan x="80" dy="78">to your counter.</tspan>
  </text>
  <text x="80" y="392" font-family="Arial" font-size="29" fill="#2D2D2D">
    <tspan x="80" dy="0">Limited, chef-curated BAM Bag pickups.</tspan>
    <tspan x="80" dy="40">Restaurant-led. No delivery handoff.</tspan>
  </text>
  <rect x="72" y="486" width="936" height="446" rx="30" fill="#FFFFFF"/>
  <g font-family="Arial" fill="#2D2D2D">
    <circle cx="96" cy="984" r="10" fill="#FF6B35"/><text x="126" y="994" font-size="27"><tspan font-weight="700" fill="#1A5C38">Be discovered.</tspan> Reach new diners.</text>
    <circle cx="96" cy="1048" r="10" fill="#FF6B35"/><text x="126" y="1058" font-size="27"><tspan font-weight="700" fill="#1A5C38">Counter pickup.</tspan> No delivery handoff.</text>
    <circle cx="96" cy="1112" r="10" fill="#FF6B35"/><text x="126" y="1122" font-size="27"><tspan font-weight="700" fill="#1A5C38">Stay in control.</tspan> Set timing and quantity.</text>
  </g>
  <rect x="0" y="1180" width="1080" height="170" fill="#1A5C38"/>
  <text x="80" y="1248" font-family="Arial" font-size="32" font-weight="700" fill="#FFFFFF">Book a 15-minute partner walkthrough.</text>
  <text x="80" y="1302" font-family="Arial" font-size="24" fill="#FFFFFF">gozaika.in/for-restaurants  |  partners@gozaika.in</text>
</svg>`;

const output = path.join(OUTPUT, "gozaika-rsk-whatsapp-en-v1.0.png");
await sharp(Buffer.from(canvas))
  .composite([
    { input: logo, left: 80, top: 55 },
    { input: hero, left: 80, top: 494 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(output);

const followUp = `Subject: Your goZaika restaurant partner walkthrough

Hi [Name],

Thank you for taking a look at goZaika.

The idea is simple: your restaurant publishes a limited, chef-curated BAM Bag with a pickup window and required disclosures. A diner reserves it in goZaika and collects it directly from your counter.

You control the timing, quantity, and release. goZaika handles the discovery and reservation path.

The next step is a 15-minute partner walkthrough:
https://gozaika.in/for-restaurants#partner-form

Commercial terms are discussed during partner qualification.

Regards,
goZaika Partner Team
partners@gozaika.in
`;
await fs.writeFile(path.join(OUTPUT, "gozaika-rsk-follow-up-email-en-v1.0.txt"), followUp, "utf8");

const whatsappCopy = `Hi [Name] - thank you for your time today. goZaika helps diners discover a limited BAM Bag and collect it directly from your restaurant. You control the release timing, quantity, and pickup window. Book a short partner walkthrough here: https://gozaika.in/for-restaurants#partner-form`;
await fs.writeFile(path.join(OUTPUT, "gozaika-rsk-follow-up-whatsapp-en-v1.0.txt"), `${whatsappCopy}\n`, "utf8");

console.log(path.relative(ROOT, output));
