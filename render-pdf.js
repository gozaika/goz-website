// Usage: node render-pdf.js <input.html> <output.pdf> [widthCss] [heightCss]
// Renders an HTML file to PDF via Playwright Chromium. If width/height omitted,
// uses the CSS @page size (preferCSSPageSize).
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const [, , htmlPath, outPath, width, height] = process.argv;
  if (!htmlPath || !outPath) {
    console.error("Usage: node render-pdf.js <input.html> <output.pdf> [width] [height]");
    process.exit(1);
  }
  const fileUrl = "file:///" + path.resolve(htmlPath).replace(/\\/g, "/");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 60000 });
  // give web fonts a moment
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}
  await page.emulateMedia({ media: "print" });
  const opts = { path: outPath, printBackground: true };
  if (width && height) {
    opts.width = width;
    opts.height = height;
    opts.preferCSSPageSize = false;
  } else {
    opts.preferCSSPageSize = true;
  }
  await page.pdf(opts);
  await browser.close();
  console.log("WROTE", outPath);
})().catch((e) => { console.error(e); process.exit(1); });
