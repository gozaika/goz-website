import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadMarketingScenarios } from "../../scenarios/loader";
import { buildMobileCaptureTargets, mobilePackageIds } from "./mobile-capture-plan";

describe("mobile capture plan", () => {
  it("builds scenario-linked mobile capture targets", () => {
    const targets = buildMobileCaptureTargets(loadMarketingScenarios());
    expect(targets.length).toBeGreaterThanOrEqual(8);
    expect(targets.map((target) => `${target.scenarioId}/${target.flow}`)).toEqual(
      expect.arrayContaining([
        "consumer-claim-bawarchi/consumer-drop-detail",
        "restaurant-live-pickup-queue/restaurant-pickup-queue",
        "staff-pickup-proof/restaurant-pickup-proof",
      ]),
    );
  });

  it("maps mobile apps to the real Android package IDs", () => {
    expect(mobilePackageIds["consumer-mobile"]).toBe("in.gozaika.customer");
    expect(mobilePackageIds["restaurant-mobile"]).toBe("in.gozaika.restaurant");
  });

  it("has a checked-in Maestro flow for every mobile target", () => {
    for (const target of buildMobileCaptureTargets(loadMarketingScenarios())) {
      const flowPath = join(process.cwd(), "marketing-assets", "flows", "maestro", `${target.flow}.yaml`);
      expect(existsSync(flowPath), `${target.flow} should have a Maestro flow`).toBe(true);
    }
  });
});
