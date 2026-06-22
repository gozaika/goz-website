import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const repo = process.env.GOZAIKA_REPO || process.cwd();
const outDir = process.env.GOZAIKA_DECK_OUT || path.join(repo, "output", "presentations", "gozaika-rsk-sales-deck-en-v1.0");

const C = {
  forest: "#164B35",
  forest2: "#0E3928",
  cream: "#F7F0DF",
  paper: "#FFFDF7",
  saffron: "#EF7D32",
  gold: "#E7B64B",
  ink: "#1F2822",
  muted: "#637068",
  white: "#FFFFFF",
  line: "#D9D2C2",
};

const assets = {
  logo: path.join(repo, "output", "marketing", "restaurant-sales-kit", "assets", "gozaika-logo.png"),
  logoWhite: path.join(repo, "output", "marketing", "restaurant-sales-kit", "assets", "gozaika-logo-white.png"),
  bam: path.join(repo, "output", "marketing", "restaurant-sales-kit", "assets", "bam-flame-drop.png"),
  restaurant: path.join(repo, "output", "marketing", "restaurant-sales-kit", "assets", "deck-restaurant.jpg"),
  square: path.join(repo, "output", "marketing", "restaurant-sales-kit", "assets", "deck-square.jpg"),
  portrait: path.join(repo, "output", "marketing", "restaurant-sales-kit", "assets", "deck-portrait.jpg"),
  culture: path.join(repo, "output", "marketing", "restaurant-sales-kit", "assets", "deck-culture.jpg"),
};

async function imageBlob(file) {
  const bytes = await fs.readFile(file);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function rect(slide, x, y, w, h, fill, radius = "rounded-xl", line = "none") {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: line === "none" ? { style: "solid", fill: "none", width: 0 } : { style: "solid", fill: line, width: 1 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function text(slide, value, x, y, w, h, size, color, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    fontFamily: opts.fontFamily || "Aptos",
    fontSize: size,
    color,
    bold: Boolean(opts.bold),
    italic: Boolean(opts.italic),
    alignment: opts.align || "left",
    verticalAlignment: opts.vAlign || "top",
  };
  return shape;
}

async function image(slide, file, x, y, w, h, alt, fit = "cover", geometry = "rect") {
  return slide.images.add({
    blob: await imageBlob(file),
    contentType: file.toLowerCase().endsWith(".jpg") ? "image/jpeg" : "image/png",
    alt,
    fit,
    position: { left: x, top: y, width: w, height: h },
    geometry,
  });
}

function footer(slide, number, dark = false) {
  text(slide, "gozaika.in  •  partners@gozaika.in", 72, 674, 520, 22, 12, dark ? "#DDE9E1" : C.muted, { bold: true });
  text(slide, String(number).padStart(2, "0"), 1150, 674, 58, 22, 12, dark ? "#DDE9E1" : C.muted, { bold: true, align: "right" });
}

function eyebrow(slide, value, dark = false) {
  text(slide, value.toUpperCase(), 72, 56, 420, 28, 13, dark ? C.gold : C.saffron, { bold: true });
}

function addPill(slide, value, x, y, w, dark = false) {
  rect(slide, x, y, w, 38, dark ? "#255F48" : "#F0E6D1", "rounded-full");
  text(slide, value, x + 14, y + 8, w - 28, 22, 13, dark ? C.white : C.forest, { bold: true, align: "center" });
}

async function build() {
  await fs.mkdir(outDir, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

  // 1 — opening
  {
    const s = deck.slides.add();
    s.background.fill = C.forest2;
    await image(s, assets.restaurant, 642, 0, 638, 720, "A premium goZaika restaurant pickup scene");
    rect(s, 612, 0, 90, 720, C.forest2, null);
    await image(s, assets.logoWhite, 72, 54, 220, 58, "goZaika logo", "contain");
    text(s, "Bring new guests\nto your counter.", 72, 190, 510, 190, 54, C.white, { bold: true });
    text(s, "A curated pickup discovery channel for distinctive food drops.", 72, 410, 480, 76, 22, "#DDE9E1");
    addPill(s, "Restaurant partner introduction", 72, 532, 270, true);
    text(s, "English sales deck  •  v1.0", 72, 606, 360, 22, 12, "#A8C1B4", { bold: true });
  }

  // 2 — definition
  {
    const s = deck.slides.add();
    s.background.fill = C.cream;
    eyebrow(s, "The proposition");
    text(s, "Curated discovery.\nOperational control.", 72, 104, 590, 132, 43, C.forest, { bold: true });
    text(s, "goZaika helps diners discover limited food drops, reserve a pickup, and collect directly from the restaurant.", 72, 262, 565, 86, 21, C.ink);
    const cards = [
      ["IS", "Pickup-first discovery\nRestaurant-defined drops\nDirect counter collection", C.forest],
      ["IS NOT", "A leftovers marketplace\nA delivery fleet\nA promise of guaranteed demand", C.saffron],
    ];
    cards.forEach(([label, body, accent], i) => {
      const x = 702 + i * 248;
      rect(s, x, 120, 220, 410, C.paper, "rounded-2xl", C.line);
      rect(s, x, 120, 220, 12, accent, "rounded-full");
      text(s, label, x + 24, 164, 172, 24, 13, accent, { bold: true });
      text(s, body, x + 24, 224, 172, 180, 20, C.ink, { bold: true });
    });
    await image(s, assets.bam, 72, 430, 118, 142, "BAM flavor-drop mark", "contain");
    text(s, "The BAM flavor drop marks the moment a distinctive drop becomes discoverable.", 214, 462, 430, 72, 17, C.muted);
    footer(s, 2);
  }

  // 3 — diner journey
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    eyebrow(s, "Diner experience");
    text(s, "Three clear moments from interest to pickup.", 72, 98, 800, 58, 38, C.forest, { bold: true });
    const steps = [
      ["01", "Discover", "See a curated drop and its pickup details."],
      ["02", "Reserve", "Choose an available pickup window and quantity."],
      ["03", "Collect", "Pick up directly at the restaurant counter."],
    ];
    steps.forEach(([n, title, body], i) => {
      const x = 72 + i * 278;
      rect(s, x, 220, 244, 306, i === 1 ? C.forest : C.cream, "rounded-2xl");
      text(s, n, x + 24, 244, 46, 28, 14, i === 1 ? C.gold : C.saffron, { bold: true });
      text(s, title, x + 24, 300, 196, 38, 27, i === 1 ? C.white : C.forest, { bold: true });
      text(s, body, x + 24, 366, 192, 86, 17, i === 1 ? "#DDE9E1" : C.ink);
      if (i < 2) text(s, "→", x + 247, 344, 28, 32, 26, C.saffron, { bold: true, align: "center" });
    });
    await image(s, assets.portrait, 938, 176, 270, 388, "goZaika diner pickup lifestyle", "cover", "roundRect");
    addPill(s, "Pickup only", 72, 568, 132);
    addPill(s, "No delivery handoff", 218, 568, 190);
    footer(s, 3);
  }

  // 4 — restaurant workflow
  {
    const s = deck.slides.add();
    s.background.fill = C.forest;
    await image(s, assets.culture, 0, 0, 492, 720, "Restaurant team preparing a distinctive food experience");
    rect(s, 446, 0, 82, 720, C.forest, null);
    eyebrow(s, "Restaurant workflow", true);
    text(s, "You define the drop.\nWe structure discovery.", 552, 108, 610, 120, 40, C.white, { bold: true });
    const rows = [
      ["SET", "Choose the item, available quantity, pickup window, and disclosures."],
      ["REVIEW", "Confirm the listing details before the drop is published."],
      ["FULFIL", "Prepare confirmed reservations for direct counter collection."],
    ];
    rows.forEach(([tag, body], i) => {
      const y = 282 + i * 94;
      rect(s, 552, y, 96, 42, "#255F48", "rounded-full");
      text(s, tag, 566, y + 10, 68, 20, 12, C.gold, { bold: true, align: "center" });
      text(s, body, 674, y + 1, 474, 58, 17, "#E6EFEA");
    });
    addPill(s, "No POS replacement required initially", 552, 588, 308, true);
    footer(s, 4, true);
  }

  // 5 — controls
  {
    const s = deck.slides.add();
    s.background.fill = C.cream;
    eyebrow(s, "Partner controls");
    text(s, "Built around the realities of a live kitchen.", 72, 100, 850, 58, 38, C.forest, { bold: true });
    const items = [
      ["Quantity", "Set the number available for each drop."],
      ["Timing", "Define pickup windows your team can support."],
      ["Disclosure", "Provide accurate ingredients and allergen information."],
      ["Readiness", "Publish only when the team and counter are prepared."],
    ];
    items.forEach(([title, body], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 72 + col * 574;
      const y = 206 + row * 186;
      rect(s, x, y, 542, 154, C.paper, "rounded-2xl", C.line);
      rect(s, x + 24, y + 28, 50, 50, i % 2 ? C.saffron : C.forest, "rounded-full");
      text(s, String(i + 1), x + 35, y + 40, 28, 24, 16, C.white, { bold: true, align: "center" });
      text(s, title, x + 96, y + 26, 390, 32, 22, C.forest, { bold: true });
      text(s, body, x + 96, y + 72, 390, 54, 16, C.muted);
    });
    text(s, "Operational details are agreed during onboarding; restaurants remain responsible for food safety and listing accuracy.", 72, 598, 1050, 36, 15, C.muted, { italic: true });
    footer(s, 5);
  }

  // 6 — pilot readiness
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    eyebrow(s, "Pilot readiness");
    text(s, "A useful first conversation starts here.", 72, 98, 720, 54, 38, C.forest, { bold: true });
    const checks = [
      "A distinctive item suited to scheduled pickup",
      "A realistic quantity and pickup window",
      "Clear ingredient and allergen disclosures",
      "A counter workflow for confirmed reservations",
    ];
    checks.forEach((v, i) => {
      const y = 202 + i * 78;
      rect(s, 72, y, 42, 42, C.forest, "rounded-full");
      text(s, "✓", 82, y + 7, 22, 24, 17, C.white, { bold: true, align: "center" });
      text(s, v, 138, y + 4, 560, 42, 19, C.ink, { bold: true });
    });
    rect(s, 786, 182, 422, 340, C.forest, "rounded-2xl");
    text(s, "COMMERCIAL NOTE", 822, 222, 330, 24, 13, C.gold, { bold: true });
    text(s, "Commercial terms are discussed during partner qualification.", 822, 274, 326, 104, 27, C.white, { bold: true });
    text(s, "No numeric pricing, revenue, demand, or conversion promise is implied in this deck.", 822, 414, 326, 64, 16, "#DDE9E1");
    addPill(s, "Clear before clever", 72, 558, 174);
    addPill(s, "Specific before sweeping", 264, 558, 212);
    footer(s, 6);
  }

  // 7 — close
  {
    const s = deck.slides.add();
    s.background.fill = C.forest2;
    await image(s, assets.square, 756, 0, 524, 720, "goZaika BAM Bag master image");
    rect(s, 714, 0, 82, 720, C.forest2, null);
    await image(s, assets.logoWhite, 72, 54, 220, 58, "goZaika logo", "contain");
    text(s, "Let’s see whether your next drop belongs on goZaika.", 72, 186, 580, 154, 44, C.white, { bold: true });
    text(s, "Start with one item, one pickup window, and an honest operational conversation.", 72, 384, 546, 72, 20, "#DDE9E1");
    rect(s, 72, 520, 482, 82, C.saffron, "rounded-xl");
    text(s, "partners@gozaika.in", 96, 538, 434, 28, 22, C.white, { bold: true });
    text(s, "gozaika.in/for-restaurants", 96, 570, 434, 20, 14, C.white, { bold: true });
    text(s, "Restaurant partner introduction  •  English v1.0", 72, 654, 500, 20, 12, "#9BB7A8", { bold: true });
  }

  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await deck.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(outDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(outDir, `${stem}.layout.json`), await layout.text());
  }
  const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(outDir, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(path.join(outDir, "gozaika-rsk-sales-deck-en-v1.0.pptx"));
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
