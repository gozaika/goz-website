// goZaika app-preview video builder — deterministic + repeatable.
//
// Stage A: Playwright renders one 1080x1920 frame per scene (a device-framed REAL
//          native screenshot + baked caption on a brand-gradient background).
// Stage B: ffmpeg adds Ken Burns motion (zoompan) per scene and cross-dissolves
//          (xfade) between scenes, with a fade in/out, → 1080x1920 9:16 H.264 mp4.
//
// No fake UI: every scene uses a real screenshot from store-assets/screenshots/.
// Captions are brand copy layered over (never edited into) the UI.
//
// Run:  node scripts/store-video/build-video.mjs --app=customer
//       node scripts/store-video/build-video.mjs --app=partner
// Deps: playwright + ffmpeg (both already available in this repo's toolchain).

import { readFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const shotsRoot = join(repoRoot, "store-assets", "screenshots");
const videoRoot = join(repoRoot, "store-assets", "video");

const W = 1080, H = 1920, FPS = 30, XFADE = 0.5;

const C = {
  saffron: "#FF6B35", saffronLight: "#FFF0E8", forest: "#1A5C38", forestLight: "#EAF3DE",
  gold: "#D4A017", cream: "#FFF8F0", charcoal: "#2D2D2D", white: "#FFFFFF",
};
const FONT = `'Inter','Segoe UI',system-ui,-apple-system,sans-serif`;

async function dataUri(absPath) {
  const buf = await readFile(absPath);
  const ext = extname(absPath).slice(1).toLowerCase();
  return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}`;
}

function background(tone) {
  if (tone === "trust") return `radial-gradient(120% 90% at 18% 8%, ${C.forestLight} 0%, ${C.cream} 46%, #FBEFDD 100%)`;
  if (tone === "habit") return `radial-gradient(120% 90% at 82% 10%, #FBEDC9 0%, ${C.cream} 50%, ${C.saffronLight} 100%)`;
  if (tone === "partner") return `radial-gradient(125% 95% at 16% 6%, ${C.forestLight} 0%, ${C.cream} 50%, #E7EEDF 100%)`;
  return `radial-gradient(125% 95% at 16% 6%, ${C.saffronLight} 0%, ${C.cream} 52%, #FCEFE0 100%)`;
}

function flameSvg(fill, size) {
  return `<svg width="${size}" height="${size}" viewBox="-60 -60 120 130" xmlns="http://www.w3.org/2000/svg"><path d="M0,-46 C26,-20 30,8 12,30 C30,18 32,-6 18,-30 C40,-2 36,40 0,52 C-36,40 -40,-2 -18,-30 C-32,-6 -30,18 -12,30 C-30,8 -26,-20 0,-46 Z" fill="${fill}"/></svg>`;
}

function deviceFrame(src, crop, maxH) {
  const { top = 0, bottom = 0 } = crop || {};
  return `<div style="filter:drop-shadow(0 34px 60px rgba(45,45,45,.30));">
    <div style="border-radius:54px;overflow:hidden;background:#000;border:10px solid #15110e;max-height:${maxH}px;display:inline-block;line-height:0;">
      <div style="overflow:hidden;width:${W}px;"><img src="${src}" style="display:block;width:${W}px;margin:${-top}px 0 ${-bottom}px 0;"/></div>
    </div></div>`;
}

async function sceneHtml(scene, videoTone) {
  const tone = scene.tone || videoTone;
  if (scene.type === "brand") {
    return `<div id="f" style="width:${W}px;height:${H}px;overflow:hidden;background:${background(tone)};
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px;text-align:center;">
      ${flameSvg(C.saffron, 120)}
      <div style="font:800 78px/1 ${FONT};color:${C.charcoal};letter-spacing:1px;">go<span style="color:${C.saffron}">Z</span>aika${scene.brandSuffix ? `<span style="color:${C.forest};font-weight:700;"> ${scene.brandSuffix}</span>` : ""}</div>
      <h1 style="margin:10px 80px 0;font:800 72px/1.1 ${FONT};color:${C.charcoal};">${scene.headline}</h1>
      <div style="margin-top:18px;font:800 42px/1 ${FONT};color:${C.forest};">${scene.cta || "Download goZaika"}</div>
    </div>`;
  }
  const src = await dataUri(join(shotsRoot, scene.app, scene.shot));
  return `<div id="f" style="width:${W}px;height:${H}px;overflow:hidden;position:relative;background:${background(tone)};">
    <div style="position:absolute;left:96px;right:96px;top:140px;text-align:center;">
      ${scene.kicker ? `<div style="display:inline-flex;align-items:center;gap:16px;margin-bottom:20px;">${flameSvg(scene.kickerColor || C.saffron, 44)}<span style="font:800 28px/1 ${FONT};letter-spacing:3px;text-transform:uppercase;color:${scene.kickerColor || C.saffron};">${scene.kicker}</span></div>` : ""}
      <h1 style="margin:0;font:800 72px/1.08 ${FONT};color:${C.charcoal};letter-spacing:-.5px;">${scene.headline}</h1>
      ${scene.sub ? `<p style="margin:20px 0 0;font:560 34px/1.3 ${FONT};color:rgba(45,45,45,.74);">${scene.sub}</p>` : ""}
    </div>
    <div style="position:absolute;left:0;right:0;top:560px;display:flex;justify-content:center;">
      ${deviceFrame(src, scene.crop, 1240)}
    </div>
  </div>`;
}

async function renderScenes(app, video, workDir) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const frames = [];
  for (let i = 0; i < video.scenes.length; i++) {
    const scene = { ...video.scenes[i], app };
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;}</style></head><body>${await sceneHtml(scene, video.tone)}</body></html>`;
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForTimeout(100);
    const p = join(workDir, `scene-${String(i).padStart(2, "0")}.png`);
    await (await page.$("#f")).screenshot({ path: p });
    frames.push({ path: p, dur: scene.dur, zoom: scene.zoom || "in" });
    console.log(`  rendered scene ${i + 1}/${video.scenes.length}`);
  }
  await browser.close();
  return frames;
}

function zoomExpr(dir) {
  // d=1 → one output frame per input frame; zoom accumulates smoothly.
  const z = dir === "out"
    ? `if(eq(on,0),1.09,max(zoom-0.00075,1.0))`   // start zoomed, ease out
    : `min(zoom+0.00075,1.09)`;                     // ease in
  return `zoompan=z='${z}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS}`;
}

function buildFfmpegArgs(frames, outPath) {
  const args = [];
  for (const f of frames) args.push("-loop", "1", "-framerate", String(FPS), "-t", String(f.dur), "-i", f.path);

  const parts = [];
  frames.forEach((f, i) => {
    parts.push(`[${i}:v]${zoomExpr(f.zoom)},format=yuv420p,setsar=1[v${i}]`);
  });

  // xfade chain with accumulating offsets.
  let prev = "v0";
  let cum = frames[0].dur;
  for (let i = 1; i < frames.length; i++) {
    const off = (cum - XFADE).toFixed(3);
    const lbl = i === frames.length - 1 ? "vout" : `x${i}`;
    parts.push(`[${prev}][v${i}]xfade=transition=fade:duration=${XFADE}:offset=${off}[${lbl}]`);
    prev = lbl;
    cum = cum + frames[i].dur - XFADE;
  }
  const total = cum;
  parts.push(`[vout]fade=t=in:st=0:d=0.5,fade=t=out:st=${(total - 0.6).toFixed(3)}:d=0.6[final]`);

  args.push("-filter_complex", parts.join(";"));
  args.push("-map", "[final]", "-r", String(FPS), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "20", "-movflags", "+faststart", "-y", outPath);
  return { args, total };
}

async function main() {
  const app = process.argv.find((a) => a.startsWith("--app="))?.split("=")[1];
  const { VIDEOS } = await import("./scenes.config.mjs");
  if (!app || !VIDEOS[app]) { console.error("Usage: --app=customer|partner"); process.exit(1); }
  const video = VIDEOS[app];

  for (const s of video.scenes) {
    if (s.type === "screen" && !existsSync(join(shotsRoot, app, s.shot))) {
      console.error(`Missing screenshot: ${app}/${s.shot}`); process.exit(1);
    }
  }

  const outDir = join(videoRoot, app);
  const workDir = join(outDir, "frames");
  await mkdir(workDir, { recursive: true });

  console.log(`Rendering ${video.scenes.length} scenes for ${app}…`);
  const frames = await renderScenes(app, video, workDir);

  const outPath = join(outDir, `${video.out}.mp4`);
  const { args, total } = buildFfmpegArgs(frames, outPath);
  console.log(`Encoding ${total.toFixed(1)}s video → ${outPath}`);
  const r = spawnSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) { console.error("ffmpeg failed"); process.exit(1); }
  console.log(`✓ ${outPath} (${total.toFixed(1)}s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
