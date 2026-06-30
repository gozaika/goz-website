// generate-manifest.mjs — build .codex-artifacts/gozaika-marketing-videos/manifest.json
// from the caption JSON files (scene source of truth) + whatever raw clips / screenshots
// currently exist on disk. Safe to run any time; it ingests manually-placed recordings
// (e.g. mobile .mp4s dropped in by the device operator) and marks per-scene capture status.
//
//   node scripts/marketing-video-capture/generate-manifest.mjs

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(repo, ".codex-artifacts/gozaika-marketing-videos");
const CAPTIONS_DIR = resolve(ROOT, "captions");
const VIDEO_ORDER = ["customer-day-in-life", "restaurant-counter", "restaurant-onboarding", "restaurant-management"];

const VIEWPORTS = {
  maestro: { width: 390, height: 844, deviceScaleFactor: 3 },
  playwright: { width: 1440, height: 900, deviceScaleFactor: 2 },
};

function git(args) {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "unknown";
}

function ffprobeDuration(absPath) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", absPath],
    { encoding: "utf8" },
  );
  if (r.status !== 0) return null;
  const v = Number.parseFloat((r.stdout || "").trim());
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
}

function rawVideoFor(videoId) {
  // Prefer a per-video raw recording; accept either .mp4 (maestro) or .webm (playwright),
  // and the admin-tail .webm if present.
  const dir = resolve(ROOT, "raw", videoId);
  if (!existsSync(dir)) return null;
  const candidates = [`${videoId}.mp4`, `${videoId}.webm`];
  for (const c of candidates) if (existsSync(resolve(dir, c))) return resolve(dir, c);
  // any other recording the operator dropped in
  const any = readdirSync(dir).find((f) => /\.(mp4|webm|mov)$/i.test(f));
  return any ? resolve(dir, any) : null;
}

function rel(absPath) {
  return absPath ? relative(repo, absPath).split("\\").join("/") : null;
}

function build() {
  const videos = [];
  for (const videoId of VIDEO_ORDER) {
    const capPath = resolve(CAPTIONS_DIR, `${videoId}.json`);
    if (!existsSync(capPath)) continue;
    const doc = JSON.parse(readFileSync(capPath, "utf8"));
    const captureMode = doc.scenes?.[0]?.source ?? "playwright";
    const perVideoRaw = rawVideoFor(videoId);
    const perVideoDur = perVideoRaw ? ffprobeDuration(perVideoRaw) : null;

    let capturedCount = 0;
    let requiredCount = 0;
    const rawClips = doc.scenes.map((scene) => {
      const optional = Boolean(scene.optional);
      const shotAbs = resolve(ROOT, "screenshots", videoId, `${scene.clipId}.png`);
      const perSceneClipAbs = resolve(ROOT, "raw", videoId, `${scene.clipId}.${scene.source === "maestro" ? "mp4" : "webm"}`);
      const hasShot = existsSync(shotAbs);
      const hasPerScene = existsSync(perSceneClipAbs);
      const clipAbs = hasPerScene ? perSceneClipAbs : perVideoRaw;
      const captured = hasShot || hasPerScene || Boolean(perVideoRaw);
      if (!optional) {
        requiredCount += 1;
        if (captured) capturedCount += 1;
      }
      return {
        clipId: scene.clipId,
        sceneId: scene.sceneId,
        path: rel(clipAbs),
        screenshotPath: hasShot ? rel(shotAbs) : null,
        source: scene.source,
        app: scene.app,
        routeOrScreen: scene.routeOrScreen ?? null,
        userKey: scene.userKey ?? null,
        viewport: VIEWPORTS[scene.source] ?? VIEWPORTS.playwright,
        durationSec: hasPerScene ? ffprobeDuration(perSceneClipAbs) : (hasShot ? null : perVideoDur),
        durationTargetSec: scene.durationTargetSec ?? null,
        captionIds: [scene.sceneId],
        captured,
        optional,
        notes: scene.source === "maestro" && !hasPerScene && perVideoRaw
          ? "scene still + shared per-video recording; trim by storyboard timing"
          : (!captured ? "not captured yet" : null),
      };
    });

    // "ready" requires a raw video AND a complete still set; stills-only (raw to be recorded
    // via the documented device command) is "partial"; nothing captured is "pending".
    const allStills = requiredCount > 0 && capturedCount === requiredCount;
    const status = !perVideoRaw
      ? (capturedCount > 0 ? "partial" : "pending")
      : (allStills ? "ready" : capturedCount > 0 ? "partial" : "pending");
    videos.push({
      videoId,
      title: doc.title,
      status,
      captureMode,
      notes: captureMode === "maestro"
        ? "Native capture: raw .mp4 via `maestro record`; per-scene stills via `maestro test`."
        : "Web capture: raw .webm + per-scene stills via the Playwright capture spec.",
      rawClips,
    });
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    artifactRoot: ".codex-artifacts/gozaika-marketing-videos",
    repo: { branch: git(["rev-parse", "--abbrev-ref", "HEAD"]), commit: git(["rev-parse", "HEAD"]) },
    videos,
  };
}

const manifest = build();
const out = resolve(ROOT, "manifest.json");
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n", "utf8");
const summary = manifest.videos.map((v) => `${v.videoId}=${v.status}`).join("  ");
console.log(`✓ wrote ${rel(out)}`);
console.log(`  ${summary}`);
