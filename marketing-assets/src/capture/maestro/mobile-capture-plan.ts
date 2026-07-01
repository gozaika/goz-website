import type { AppSurface, MarketingScenario } from "../../scenarios/schema";
import { getViewportPreset, type ViewportPreset } from "../viewport-presets";

export type MobileAppSurface = Extract<AppSurface, "consumer-mobile" | "restaurant-mobile">;

export type MobileCaptureTarget = {
  readonly scenarioId: string;
  readonly captureId: string;
  readonly app: MobileAppSurface;
  readonly packageId: string;
  readonly flow: string;
  readonly viewport: ViewportPreset;
  readonly sourceOfTruth: string;
};

export type MobileCaptureFilter = {
  readonly scenarioId?: string;
  readonly captureId?: string;
  readonly app?: MobileAppSurface;
  readonly flow?: string;
};

export const mobilePackageIds = {
  "consumer-mobile": "in.gozaika.customer",
  "restaurant-mobile": "in.gozaika.restaurant",
} as const satisfies Record<MobileAppSurface, string>;

function isMobileApp(app: AppSurface | undefined): app is MobileAppSurface {
  return app === "consumer-mobile" || app === "restaurant-mobile";
}

export function buildMobileCaptureTargets(
  scenarios: readonly MarketingScenario[],
  filter: MobileCaptureFilter = {},
): MobileCaptureTarget[] {
  const targets = scenarios.flatMap((scenario) =>
    scenario.captures
      .filter((capture) => capture.kind === "mobile")
      .map((capture) => {
        const app = capture.app ?? scenario.app;
        if (!isMobileApp(app)) {
          throw new Error(`${scenario.id}/${capture.id} is a mobile capture but does not resolve to a mobile app.`);
        }
        if (!capture.flow) {
          throw new Error(`${scenario.id}/${capture.id} is a mobile capture without a Maestro flow.`);
        }

        return {
          scenarioId: scenario.id,
          captureId: capture.id,
          app,
          packageId: mobilePackageIds[app],
          flow: capture.flow,
          viewport: getViewportPreset(capture.viewport ?? "mobile-web"),
          sourceOfTruth: capture.sourceOfTruth,
        } satisfies MobileCaptureTarget;
      }),
  );

  return targets.filter((target) => {
    if (filter.scenarioId && target.scenarioId !== filter.scenarioId) return false;
    if (filter.captureId && target.captureId !== filter.captureId) return false;
    if (filter.app && target.app !== filter.app) return false;
    if (filter.flow && target.flow !== filter.flow) return false;
    return true;
  });
}
