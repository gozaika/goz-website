import type { AppSurface, MarketingScenario } from "../../scenarios/schema";
import { getViewportPreset, type ViewportPreset } from "../viewport-presets";

export type WebAppSurface = Extract<AppSurface, "website" | "consumer-web" | "restaurant-web">;

export type WebCaptureTarget = {
  readonly scenarioId: string;
  readonly captureId: string;
  readonly app: WebAppSurface;
  readonly route: string;
  readonly viewport: ViewportPreset;
  readonly sourceOfTruth: string;
};

export type WebCaptureFilter = {
  readonly scenarioId?: string;
  readonly captureId?: string;
  readonly app?: WebAppSurface;
};

function isWebApp(app: AppSurface | undefined): app is WebAppSurface {
  return app === "website" || app === "consumer-web" || app === "restaurant-web";
}

export function buildWebCaptureTargets(
  scenarios: readonly MarketingScenario[],
  filter: WebCaptureFilter = {},
): WebCaptureTarget[] {
  const targets = scenarios.flatMap((scenario) =>
    scenario.captures
      .filter((capture) => capture.kind === "web")
      .map((capture) => {
        const app = capture.app ?? scenario.app;
        if (!isWebApp(app)) {
          throw new Error(`${scenario.id}/${capture.id} is a web capture but does not resolve to a web app.`);
        }
        if (!capture.route) {
          throw new Error(`${scenario.id}/${capture.id} is a web capture without a route.`);
        }

        return {
          scenarioId: scenario.id,
          captureId: capture.id,
          app,
          route: capture.route,
          viewport: getViewportPreset(capture.viewport ?? "desktop-wide"),
          sourceOfTruth: capture.sourceOfTruth,
        } satisfies WebCaptureTarget;
      }),
  );

  return targets.filter((target) => {
    if (filter.scenarioId && target.scenarioId !== filter.scenarioId) return false;
    if (filter.captureId && target.captureId !== filter.captureId) return false;
    if (filter.app && target.app !== filter.app) return false;
    return true;
  });
}

export function baseUrlForApp(app: WebAppSurface, override?: string): string {
  if (override) return override.replace(/\/$/, "");
  if (app === "website") return (process.env.WEBSITE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (app === "consumer-web") return (process.env.CONSUMER_WEB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return (process.env.RESTAURANT_WEB_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
}
