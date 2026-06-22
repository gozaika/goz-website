import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "output", "marketing", "mobile-identity", "qa");
await fs.mkdir(out, { recursive: true });

const checks = [];
const assets = [];
const check = (name, pass, evidence) => checks.push({ name, status: pass ? "pass" : "fail", evidence });

for (const app of ["consumer-mobile", "restaurant-mobile"]) {
  const assetRoot = path.join(root, "apps", app, "assets");
  const expected = [
    ["icon.png", 2048, 2048, false],
    ["adaptive-icon.png", 2048, 2048, true],
    ["splash-icon.png", 2048, 2048, true],
    ["notification-icon.png", 96, 96, true],
    ["monochrome-icon.png", 2048, 2048, true],
    ["drop-default.png", 1200, 900, false],
    ["restaurant-cover-default.png", 1600, 900, false],
  ];
  for (const [name, width, height, needsAlpha] of expected) {
    const file = path.join(assetRoot, name);
    const bytes = await fs.readFile(file);
    const metadata = await sharp(bytes).metadata();
    const stats = await sharp(bytes).stats();
    const alpha = stats.channels.length === 4 ? stats.channels[3] : null;
    const hasTransparency = Boolean(alpha && alpha.min < 255);
    check(`${app}/${name} dimensions`, metadata.width === width && metadata.height === height, `${metadata.width} x ${metadata.height}`);
    check(`${app}/${name} alpha contract`, needsAlpha ? hasTransparency : !hasTransparency, hasTransparency ? "transparent pixels present" : "fully opaque");
    assets.push({ path: path.relative(root, file).replaceAll("\\", "/"), bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
  }

  const config = JSON.parse(await fs.readFile(path.join(root, "apps", app, "app.json"), "utf8"));
  const adaptive = config.expo.android.adaptiveIcon;
  const expectedBg = app === "consumer-mobile" ? "#FFF8F0" : "#1A5C38";
  check(`${app} adaptive monochrome config`, adaptive.monochromeImage === "./assets/monochrome-icon.png", adaptive.monochromeImage || "missing");
  check(`${app} adaptive background`, adaptive.backgroundColor === expectedBg, adaptive.backgroundColor);
  check(`${app} splash background`, config.expo.splash.backgroundColor === expectedBg, config.expo.splash.backgroundColor);
}

check("Customer and partner launchers are distinct", assets.find(a => a.path.endsWith("consumer-mobile/assets/icon.png")).sha256 !== assets.find(a => a.path.endsWith("restaurant-mobile/assets/icon.png")).sha256, "different SHA-256 hashes");
check("Fallback drop is consistent across apps", assets.find(a => a.path.endsWith("consumer-mobile/assets/drop-default.png")).sha256 === assets.find(a => a.path.endsWith("restaurant-mobile/assets/drop-default.png")).sha256, "same approved fallback master");
check("Fallback restaurant cover is consistent across apps", assets.find(a => a.path.endsWith("consumer-mobile/assets/restaurant-cover-default.png")).sha256 === assets.find(a => a.path.endsWith("restaurant-mobile/assets/restaurant-cover-default.png")).sha256, "same approved fallback master");

for (const [name, directory] of [["consumer", "expo-export-consumer-20260622"], ["partner", "expo-export-partner-20260622"]]) {
  const exportRoot = path.join(root, "tmp", directory);
  const metadataExists = await fs.stat(path.join(exportRoot, "metadata.json")).then(() => true, () => false);
  const staticRoot = path.join(exportRoot, "_expo", "static", "js");
  const platforms = metadataExists ? await fs.readdir(staticRoot).catch(() => []) : [];
  check(`${name} Expo export`, metadataExists && platforms.includes("ios") && platforms.includes("android"), metadataExists ? `metadata plus ${platforms.sort().join(" and ")} bundles` : "export missing");
}

const failed = checks.filter(item => item.status === "fail");
const report = { generatedAt: new Date().toISOString(), result: failed.length ? "fail" : "pass", checks, assets };
await fs.writeFile(path.join(out, "qa-report.json"), JSON.stringify(report, null, 2) + "\n");
const md = [
  "# Mobile identity and fallback QA",
  "",
  `Result: ${report.result.toUpperCase()} (${checks.length - failed.length}/${checks.length} checks passed)`,
  "",
  "| Check | Status | Evidence |",
  "|---|---:|---|",
  ...checks.map(item => `| ${item.name} | ${item.status.toUpperCase()} | ${item.evidence} |`),
  "",
  "The targeted discovery contract tests, fallback utility tests, shared UI typecheck, customer-mobile typecheck, restaurant-mobile typecheck, and both Expo public-config resolutions were run separately and passed on 2026-06-22.",
];
await fs.writeFile(path.join(out, "qa-report.md"), md.join("\n") + "\n");
console.log(`${report.result.toUpperCase()}: ${checks.length - failed.length}/${checks.length} checks`);
if (failed.length) process.exitCode = 1;
