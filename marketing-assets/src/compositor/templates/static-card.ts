import { readFileSync } from "node:fs";
import { palette } from "@gozaika/design-tokens";

export type StaticCardTemplate = "app-store-card" | "website-proof-card" | "restaurant-proof-card" | "tradeshow-poster";

export type StaticCardInput = {
  readonly assetId: string;
  readonly scenarioId: string;
  readonly template: StaticCardTemplate;
  readonly width: number;
  readonly height: number;
  readonly safeMarginPx: number;
  readonly surface: "customer" | "restaurant" | "website" | "store";
  readonly headline: string;
  readonly subhead?: string;
  readonly labels: readonly string[];
  readonly screenshotPath: string;
  readonly sourceSha256: string;
  readonly sourceRouteOrFlow: string;
  readonly pass: "v1-functional" | "v2-polished" | "v3-launch-grade";
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function textLines(lines: readonly string[], x: number, y: number, size: number, color: string, weight = 600, lineGap = 1.25) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * size * lineGap}" fill="${color}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function labelPills(labels: readonly string[], x: number, y: number, accent: string, textColor: string) {
  let cursor = x;
  return labels
    .slice(0, 3)
    .map((label) => {
      const width = Math.max(130, label.length * 15 + 44);
      const pill = `<rect x="${cursor}" y="${y}" width="${width}" height="54" rx="27" fill="${accent}" opacity="0.12"/><text x="${cursor + 22}" y="${y + 35}" fill="${textColor}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(label)}</text>`;
      cursor += width + 18;
      return pill;
    })
    .join("");
}

function screenshotImage(path: string): string {
  return readFileSync(path).toString("base64");
}

export function renderStaticCardSvg(input: StaticCardInput): string {
  const accent = input.surface === "restaurant" ? palette.forest : palette.saffron;
  const accentText = input.surface === "restaurant" ? palette.forest : palette.saffronText;
  const screenshot = screenshotImage(input.screenshotPath);
  const isPortrait = input.height > input.width;
  const isPolished = input.pass !== "v1-functional";
  const deviceWidth = isPortrait ? Math.round(input.width * (isPolished ? 0.64 : 0.58)) : Math.round(input.width * 0.34);
  const deviceHeight = Math.round(deviceWidth * 2.05);
  const deviceX = isPortrait ? Math.round((input.width - deviceWidth) / 2) : Math.round(input.width * 0.61);
  const deviceY = isPortrait ? Math.round(input.height * (isPolished ? 0.245 : 0.27)) : Math.round((input.height - deviceHeight) / 2);
  const textX = input.safeMarginPx;
  const textY = input.safeMarginPx + (isPortrait ? (isPolished ? 78 : 90) : 40);
  const titleSize = isPortrait ? (isPolished ? 72 : 76) : 58;
  const subSize = isPortrait ? (isPolished ? 32 : 34) : 30;
  const headlineLines = wrapText(input.headline, isPortrait ? (isPolished ? 20 : 18) : 20);
  const subLines = wrapText(input.subhead ?? "Real app proof, composed without altering UI.", isPortrait ? 36 : 42);
  const protectedX = deviceX + 28;
  const protectedY = deviceY + 34;
  const protectedWidth = deviceWidth - 56;
  const protectedHeight = deviceHeight - 68;
  const eyebrow = isPolished ? (input.surface === "restaurant" ? "PARTNER PROOF" : "LIVE DROP PROOF") : input.pass.replaceAll("-", " ").toUpperCase();
  const bgTail = input.surface === "restaurant" ? palette.successBg : palette.warningBg;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${palette.cream}"/>
      <stop offset="${isPolished ? "46%" : "54%"}" stop-color="${palette.white}"/>
      <stop offset="100%" stop-color="${bgTail}"/>
    </linearGradient>
    <radialGradient id="halo" cx="72%" cy="22%" r="62%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="48%" stop-color="${palette.gold}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${palette.cream}" stop-opacity="0"/>
    </radialGradient>
    <filter id="deviceShadow" x="-30%" y="-20%" width="160%" height="150%">
      <feDropShadow dx="0" dy="34" stdDeviation="30" flood-color="${palette.charcoal}" flood-opacity="0.28"/>
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="${accent}" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="${input.width}" height="${input.height}" fill="url(#bg)"/>
  <rect width="${input.width}" height="${input.height}" fill="url(#halo)"/>
  ${
    isPolished
      ? `<rect x="${input.safeMarginPx}" y="${deviceY - 52}" width="${input.width - input.safeMarginPx * 2}" height="1" fill="${accent}" opacity="0.18"/>
  <rect x="${deviceX - 34}" y="${deviceY - 28}" width="${deviceWidth + 68}" height="${deviceHeight + 56}" rx="${Math.round(deviceWidth * 0.13)}" fill="${palette.white}" opacity="0.28"/>`
      : `<circle cx="${input.width - input.safeMarginPx}" cy="${input.safeMarginPx}" r="${Math.round(input.width * 0.18)}" fill="${accent}" opacity="0.08"/>`
  }
  <text x="${textX}" y="${textY - 62}" fill="${accentText}" font-family="Inter, Arial, sans-serif" font-size="${isPortrait ? 28 : 24}" font-weight="800">${escapeXml(eyebrow)}</text>
  ${textLines(headlineLines, textX, textY, titleSize, palette.charcoal, 800, 1.08)}
  ${textLines(subLines, textX, textY + headlineLines.length * titleSize * 1.16 + 38, subSize, palette.muted, 500, 1.25)}
  ${labelPills(input.labels, textX, input.height - input.safeMarginPx - 82, accent, accentText)}
  <g filter="url(#deviceShadow)">
    <rect x="${deviceX}" y="${deviceY}" width="${deviceWidth}" height="${deviceHeight}" rx="${Math.round(deviceWidth * 0.11)}" fill="${palette.charcoal}"/>
    <rect x="${protectedX}" y="${protectedY}" width="${protectedWidth}" height="${protectedHeight}" rx="${Math.round(deviceWidth * 0.075)}" fill="${palette.white}"/>
    <clipPath id="screenClip"><rect x="${protectedX}" y="${protectedY}" width="${protectedWidth}" height="${protectedHeight}" rx="${Math.round(deviceWidth * 0.075)}"/></clipPath>
    <image x="${protectedX}" y="${protectedY}" width="${protectedWidth}" height="${protectedHeight}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${screenshot}" clip-path="url(#screenClip)"/>
  </g>
  <text x="${input.safeMarginPx}" y="${input.height - 28}" fill="${palette.muted}" font-family="Inter, Arial, sans-serif" font-size="18">Source ${escapeXml(input.scenarioId)} / ${escapeXml(input.sourceRouteOrFlow)} / ${escapeXml(input.sourceSha256.slice(0, 12))}</text>
</svg>`;
}

export function protectedScreenRegion(input: StaticCardInput) {
  const isPortrait = input.height > input.width;
  const isPolished = input.pass !== "v1-functional";
  const deviceWidth = isPortrait ? Math.round(input.width * (isPolished ? 0.64 : 0.58)) : Math.round(input.width * 0.34);
  const deviceHeight = Math.round(deviceWidth * 2.05);
  const deviceX = isPortrait ? Math.round((input.width - deviceWidth) / 2) : Math.round(input.width * 0.61);
  const deviceY = isPortrait ? Math.round(input.height * (isPolished ? 0.245 : 0.27)) : Math.round((input.height - deviceHeight) / 2);
  return {
    x: deviceX + 28,
    y: deviceY + 34,
    width: deviceWidth - 56,
    height: deviceHeight - 68,
  };
}
