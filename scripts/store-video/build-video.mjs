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

// Procedurally-generated atmospheric background (no external image model): a base
// brand gradient + soft blurred bokeh blobs + a warm light sweep + subtle grain
// (+ a faint structural grid for partner) + a bottom vignette. Mood only, no UI/text.
function atmosphere(tone) {
  const warm = tone !== "partner" && tone !== "trust";
  const blobs = (tone === "partner")
    ? [{ c: C.forest, o: 0.11, x: "12%", y: "16%", r: 600 }, { c: "#2C6E6B", o: 0.10, x: "88%", y: "74%", r: 660 }, { c: C.gold, o: 0.07, x: "74%", y: "12%", r: 380 }]
    : [{ c: C.saffron, o: 0.13, x: "14%", y: "12%", r: 600 }, { c: C.gold, o: 0.11, x: "86%", y: "80%", r: 640 }, { c: C.saffron, o: 0.07, x: "80%", y: "30%", r: 360 }];
  const sweep = warm ? "rgba(255,240,225,0.75)" : "rgba(255,255,255,0.55)";
  let l = `<div style="position:absolute;inset:0;background:radial-gradient(58% 42% at 16% 6%, ${sweep} 0%, transparent 62%);"></div>`;
  for (const b of blobs) l += `<div style="position:absolute;left:${b.x};top:${b.y};width:${b.r}px;height:${b.r}px;transform:translate(-50%,-50%);border-radius:50%;background:${b.c};opacity:${b.o};filter:blur(95px);"></div>`;
  l += `<div style="position:absolute;inset:0;opacity:0.05;background-image:radial-gradient(rgba(45,45,45,0.55) 1px,transparent 1px);background-size:26px 26px;"></div>`;
  if (tone === "partner") l += `<div style="position:absolute;inset:0;opacity:0.05;background-image:linear-gradient(rgba(26,92,56,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(26,92,56,.6) 1px,transparent 1px);background-size:128px 128px;"></div>`;
  l += `<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 122%, rgba(45,45,45,0.12) 0%, transparent 55%);"></div>`;
  return l;
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
  const base = `width:${W}px;height:${H}px;overflow:hidden;position:relative;background:${background(tone)};`;
  if (scene.type === "brand") {
    return `<div id="f" style="${base}">
      ${atmosphere(tone)}
      <div style="position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px;text-align:center;">
        ${flameSvg(C.saffron, 120)}
        <div style="font:800 78px/1 ${FONT};color:${C.charcoal};letter-spacing:1px;">go<span style="color:${C.saffron}">Z</span>aika${scene.brandSuffix ? `<span style="color:${C.forest};font-weight:700;"> ${scene.brandSuffix}</span>` : ""}</div>
        <h1 style="margin:10px 80px 0;font:800 72px/1.1 ${FONT};color:${C.charcoal};">${scene.headline}</h1>
        <div style="margin-top:18px;font:800 42px/1 ${FONT};color:${C.forest};">${scene.cta || "Download goZaika"}</div>
      </div>
    </div>`;
  }
  const src = await dataUri(join(shotsRoot, scene.app, scene.shot));
  return `<div id="f" style="${base}">
    ${atmosphere(tone)}
    <div style="position:absolute;left:96px;right:96px;top:140px;text-align:center;z-index:1;">
      ${scene.kicker ? `<div style="display:inline-flex;align-items:center;gap:16px;margin-bottom:20px;">${flameSvg(scene.kickerColor || C.saffron, 44)}<span style="font:800 28px/1 ${FONT};letter-spacing:3px;text-transform:uppercase;color:${scene.kickerColor || C.saffron};">${scene.kicker}</span></div>` : ""}
      <h1 style="margin:0;font:800 72px/1.08 ${FONT};color:${C.charcoal};letter-spacing:-.5px;">${scene.headline}</h1>
      ${scene.sub ? `<p style="margin:20px 0 0;font:560 34px/1.3 ${FONT};color:rgba(45,45,45,.74);">${scene.sub}</p>` : ""}
    </div>
    <div style="position:absolute;left:0;right:0;top:560px;display:flex;justify-content:center;z-index:1;">
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
    // Motion variety: cycle presets for rhythm; brand scene gets a calm zoom-in.
    const cycle = ["zoomin", "panright", "zoomout", "panleft", "zoomin", "panup"];
    const motion = scene.motion || (scene.type === "brand" ? "zoomin" : cycle[i % cycle.length]);
    frames.push({ path: p, dur: scene.dur, motion });
    console.log(`  rendered scene ${i + 1}/${video.scenes.length} (${motion})`);
  }
  await browser.close();
  return frames;
}

// Ken Burns motion presets. d=1 → one output frame per (looped) input frame, so
// `zoom` accumulates smoothly and `on` (output frame index) drives pans.
function motionFilter(preset, dur) {
  const N = Math.max(1, Math.round(dur * FPS));
  const center = `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
  const Z = 1.09; // fixed zoom that leaves room to pan
  const tail = `:s=${W}x${H}:fps=${FPS}`;
  switch (preset) {
    case "zoomout":  return `zoompan=z='if(eq(on,0),1.10,max(zoom-0.00085,1.0))':d=1:${center}${tail}`;
    case "panright": return `zoompan=z='${Z}':d=1:x='(iw-iw/zoom)*on/${N}':y='ih/2-(ih/zoom/2)'${tail}`;
    case "panleft":  return `zoompan=z='${Z}':d=1:x='(iw-iw/zoom)*(1-on/${N})':y='ih/2-(ih/zoom/2)'${tail}`;
    case "panup":    return `zoompan=z='${Z}':d=1:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/${N})'${tail}`;
    case "pandown":  return `zoompan=z='${Z}':d=1:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*on/${N}'${tail}`;
    default:         return `zoompan=z='min(zoom+0.00085,1.10)':d=1:${center}${tail}`; // zoomin
  }
}

// A soft synthesized ambient pad (placeholder bed — swap for a licensed track later).
// Warm chord for customer, calmer/lower for partner; low volume, lowpass, gentle echo.
function audioPass(videoPath, outPath, total, app) {
  const chord = app === "partner"
    ? [130.81, 196.0, 261.63, 329.63]   // C major (calm, operational)
    : [146.83, 220.0, 293.66, 369.99];  // D major (warm, appetite)
  const srcs = chord.map((f, i) => `sine=frequency=${f}:duration=${total.toFixed(2)}[s${i}]`).join(";");
  const mix = chord.map((_, i) => `[s${i}]`).join("");
  const af = `${srcs};${mix}amix=inputs=${chord.length}:normalize=0,volume=0.05,tremolo=f=0.12:d=0.5,lowpass=f=1000,aecho=0.8:0.6:90:0.3,afade=t=in:st=0:d=2,afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5,alimiter=limit=0.9[a]`;
  return ["-i", videoPath, "-filter_complex", af, "-map", "0:v", "-map", "[a]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", "-y", outPath];
}

function buildFfmpegArgs(frames, outPath) {
  const args = [];
  for (const f of frames) args.push("-loop", "1", "-framerate", String(FPS), "-t", String(f.dur), "-i", f.path);

  const parts = [];
  frames.forEach((f, i) => {
    parts.push(`[${i}:v]${motionFilter(f.motion, f.dur)},format=yuv420p,setsar=1[v${i}]`);
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
  const silentPath = join(workDir, `${video.out}.silent.mp4`);
  const { args, total } = buildFfmpegArgs(frames, silentPath);
  console.log(`Encoding ${total.toFixed(1)}s video (motion + dissolves)…`);
  let r = spawnSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) { console.error("ffmpeg (video) failed"); process.exit(1); }

  const noAudio = process.argv.includes("--no-audio");
  if (noAudio) {
    spawnSync("ffmpeg", ["-i", silentPath, "-c", "copy", "-y", outPath], { stdio: ["ignore", "ignore", "inherit"] });
  } else {
    console.log("Adding ambient audio bed…");
    r = spawnSync("ffmpeg", audioPass(silentPath, outPath, total, app), { stdio: ["ignore", "ignore", "inherit"] });
    if (r.status !== 0) { console.error("ffmpeg (audio) failed"); process.exit(1); }
  }
  await rm(silentPath, { force: true });
  console.log(`✓ ${outPath} (${total.toFixed(1)}s${noAudio ? "" : " + audio"})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
