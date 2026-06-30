import { describe, expect, it } from "vitest";
import { loadMarketingScenarios } from "../../scenarios/loader";
import { baseUrlForApp, buildWebCaptureTargets } from "./capture-plan";

describe("web capture plan", () => {
  it("builds scenario-linked web capture targets", () => {
    const targets = buildWebCaptureTargets(loadMarketingScenarios());
    expect(targets.length).toBeGreaterThanOrEqual(2);
    expect(targets.map((target) => `${target.scenarioId}/${target.captureId}`)).toEqual(
      expect.arrayContaining([
        "consumer-map-discovery/web-drops-map",
        "restaurant-publish-drop/web-template-list",
      ]),
    );
  });

  it("supports app and scenario filters", () => {
    const targets = buildWebCaptureTargets(loadMarketingScenarios(), {
      app: "consumer-web",
      scenarioId: "consumer-map-discovery",
    });

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ app: "consumer-web", route: "/drops" });
  });

  it("resolves default and override base URLs", () => {
    expect(baseUrlForApp("restaurant-web")).toBe("http://localhost:3001");
    expect(baseUrlForApp("consumer-web", "http://127.0.0.1:4000/")).toBe("http://127.0.0.1:4000");
  });
});
