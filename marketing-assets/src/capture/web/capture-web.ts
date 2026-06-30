import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { loadMarketingScenarios } from "../../scenarios/loader";
import { baseUrlForApp, buildWebCaptureTargets, type WebAppSurface } from "./capture-plan";

type CliArgs = {
  readonly scenarioId?: string;
  readonly captureId?: string;
  readonly app?: WebAppSurface;
  readonly baseUrl?: string;
  readonly outDir: string;
  readonly storageState?: string;
};

function parseArgs(argv: readonly string[]): CliArgs {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args.set(token.slice(2), "true");
    } else {
      args.set(token.slice(2), value);
      index += 1;
    }
  }

  const app = args.get("app");
  if (app && app !== "website" && app !== "consumer-web" && app !== "restaurant-web") {
    throw new Error("--app must be website, consumer-web, or restaurant-web.");
  }

  return {
    scenarioId: args.get("scenario"),
    captureId: args.get("capture"),
    app,
    baseUrl: args.get("base-url"),
    outDir: args.get("out-dir") ?? join("marketing-assets", "captures", "raw"),
    storageState: args.get("storage-state"),
  };
}

function sourceCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function outputPath(outDir: string, scenarioId: string, captureId: string, viewportId: string): string {
  return join(outDir, scenarioId, `${captureId}-${viewportId}.png`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarios = loadMarketingScenarios();
  const targets = buildWebCaptureTargets(scenarios, {
    scenarioId: args.scenarioId,
    captureId: args.captureId,
    app: args.app,
  });

  if (targets.length === 0) {
    throw new Error("No web capture targets matched. Check marketing-assets/scenarios/*.yaml and CLI filters.");
  }

  const browser = await chromium.launch();
  const commit = sourceCommit();
  try {
    for (const target of targets) {
      const baseUrl = baseUrlForApp(target.app, args.baseUrl);
      const context = await browser.newContext({
        deviceScaleFactor: target.viewport.deviceScaleFactor,
        storageState: args.storageState,
        viewport: { width: target.viewport.width, height: target.viewport.height },
      });
      const page = await context.newPage();
      const url = new URL(target.route, `${baseUrl}/`).toString();

      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      if (target.route.startsWith("/portal") && page.url().includes("/auth")) {
        throw new Error(
          `${target.scenarioId}/${target.captureId} redirected to auth. Provide --storage-state with an authenticated restaurant-web session.`,
        );
      }

      const screenshot = await page.screenshot({ fullPage: true, type: "png" });
      const hash = sha256(screenshot);
      const pngPath = outputPath(args.outDir, target.scenarioId, target.captureId, target.viewport.id);
      mkdirSync(dirname(pngPath), { recursive: true });
      writeFileSync(pngPath, screenshot);
      writeFileSync(
        pngPath.replace(/\.png$/, ".json"),
        JSON.stringify(
          {
            schemaVersion: 1,
            scenarioId: target.scenarioId,
            captureId: target.captureId,
            app: target.app,
            route: target.route,
            url,
            viewport: target.viewport,
            sourceOfTruth: target.sourceOfTruth,
            sourceCommit: commit,
            capturedAt: new Date().toISOString(),
            sha256: hash,
            file: pngPath.replaceAll("\\", "/"),
            protectedRegions: [],
          },
          null,
          2,
        ),
      );
      await context.close();
      console.log(`Captured ${target.scenarioId}/${target.captureId} -> ${pngPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
