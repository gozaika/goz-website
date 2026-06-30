import { describe, expect, it } from "vitest";
import { lintScenarioCopy } from "./copy-lint";
import { loadMarketingScenarios, validateMarketingAssetFoundation } from "./loader";
import { marketingScenarioSchema } from "./schema";

describe("launch asset scenarios", () => {
  it("loads the eight starter scenarios", () => {
    const scenarios = loadMarketingScenarios();
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "consumer-allergen-trust",
      "consumer-claim-bawarchi",
      "consumer-map-discovery",
      "consumer-passport-swaad-club",
      "restaurant-live-pickup-queue",
      "restaurant-publish-drop",
      "restaurant-zaikaiq-overview",
      "staff-pickup-proof",
    ]);
  });

  it("validates manifests and keeps copy clean", () => {
    const result = validateMarketingAssetFoundation();
    expect(result.errors).toEqual([]);
    expect(result.copyIssues).toEqual([]);
  });

  it("rejects customer scenarios with restaurant-facing outputs", () => {
    const base = loadMarketingScenarios()[1];
    expect(base?.id).toBe("consumer-claim-bawarchi");

    const parsed = marketingScenarioSchema.safeParse({
      ...base,
      plannedOutputs: [
        {
          id: "bad-output",
          surface: "restaurant-sales",
          preset: "restaurant-proof-card",
          passTarget: "v1-functional",
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("flags banned and unsupported launch copy", () => {
    const scenario = loadMarketingScenarios()[0];
    expect(scenario).toBeDefined();
    const issues = lintScenarioCopy({
      ...scenario!,
      copy: {
        ...scenario!.copy,
        headline: "Cheap surplus pickup with 5 star proof",
      },
    });

    expect(issues.map((issue) => issue.term)).toEqual(["cheap", "surplus", "rating"]);
  });
});
