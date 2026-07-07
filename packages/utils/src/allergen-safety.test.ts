import { describe, expect, it } from "vitest";

import {
  evaluateAllergenConflict,
  evaluateEnvelopeBounding,
  formatAllergenLabel,
  formatDietaryLabel,
  type ConsumerSafetyPrefs,
  type DropSafetyProfile,
} from "./allergen-safety";

const noPrefs: ConsumerSafetyPrefs = { avoidAllergenCodes: [], dietaryPreferenceCodes: [] };

function drop(allergenCodes: string[], dietaryCategoryCode = "NON_VEG"): DropSafetyProfile {
  return { allergenCodes, dietaryCategoryCode };
}

describe("evaluateAllergenConflict — allergens", () => {
  it("flags an avoided allergen disclosed by the bag", () => {
    const result = evaluateAllergenConflict(
      { avoidAllergenCodes: ["NUTS"], dietaryPreferenceCodes: [] },
      drop(["DAIRY", "NUTS", "SESAME"]),
    );
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingAllergens).toEqual(["NUTS"]);
    expect(result.dietaryConflict).toBeNull();
  });

  it("is case- and whitespace-insensitive", () => {
    const result = evaluateAllergenConflict(
      { avoidAllergenCodes: [" nuts "], dietaryPreferenceCodes: [] },
      drop(["Nuts"]),
    );
    expect(result.conflictingAllergens).toEqual(["NUTS"]);
  });

  it("does not flag when there is no overlap", () => {
    const result = evaluateAllergenConflict(
      { avoidAllergenCodes: ["PEANUTS"], dietaryPreferenceCodes: [] },
      drop(["DAIRY", "WHEAT_GLUTEN"]),
    );
    expect(result.hasConflict).toBe(false);
    expect(result.conflictingAllergens).toEqual([]);
  });

  it("returns no conflict when the customer avoids nothing", () => {
    expect(evaluateAllergenConflict(noPrefs, drop(["NUTS", "DAIRY"])).hasConflict).toBe(false);
  });

  it("reports multiple overlapping allergens", () => {
    const result = evaluateAllergenConflict(
      { avoidAllergenCodes: ["NUTS", "DAIRY"], dietaryPreferenceCodes: [] },
      drop(["DAIRY", "NUTS", "EGGS"]),
    );
    expect(new Set(result.conflictingAllergens)).toEqual(new Set(["NUTS", "DAIRY"]));
  });
});

describe("evaluateAllergenConflict — dietary", () => {
  it("flags a VEG customer against a NON_VEG bag", () => {
    const result = evaluateAllergenConflict({ avoidAllergenCodes: [], dietaryPreferenceCodes: ["VEG"] }, drop([], "NON_VEG"));
    expect(result.hasConflict).toBe(true);
    expect(result.dietaryConflict).toBe("NON_VEG");
  });

  it("accepts a VEG customer on a JAIN bag (stricter-veg is fine)", () => {
    const result = evaluateAllergenConflict({ avoidAllergenCodes: [], dietaryPreferenceCodes: ["VEG"] }, drop([], "JAIN"));
    expect(result.hasConflict).toBe(false);
    expect(result.dietaryConflict).toBeNull();
  });

  it("flags a JAIN customer against a plain VEG bag", () => {
    const result = evaluateAllergenConflict({ avoidAllergenCodes: [], dietaryPreferenceCodes: ["JAIN"] }, drop([], "VEG"));
    expect(result.dietaryConflict).toBe("VEG");
  });

  it("imposes no dietary restriction for a NON_VEG customer", () => {
    expect(evaluateAllergenConflict({ avoidAllergenCodes: [], dietaryPreferenceCodes: ["NON_VEG"] }, drop([], "NON_VEG")).hasConflict).toBe(
      false,
    );
  });

  it("accepts an EGG_ONLY customer on a VEG or EGG_ONLY bag but not NON_VEG", () => {
    const prefs = { avoidAllergenCodes: [], dietaryPreferenceCodes: ["EGG_ONLY"] };
    expect(evaluateAllergenConflict(prefs, drop([], "VEG")).hasConflict).toBe(false);
    expect(evaluateAllergenConflict(prefs, drop([], "EGG_ONLY")).hasConflict).toBe(false);
    expect(evaluateAllergenConflict(prefs, drop([], "NON_VEG")).dietaryConflict).toBe("NON_VEG");
  });

  it("accepts when at least one of several preferences accepts the bag", () => {
    const result = evaluateAllergenConflict(
      { avoidAllergenCodes: [], dietaryPreferenceCodes: ["VEG", "NON_VEG"] },
      drop([], "NON_VEG"),
    );
    expect(result.hasConflict).toBe(false);
  });

  it("fails open on an unknown preference code (never fabricates a warning)", () => {
    const result = evaluateAllergenConflict({ avoidAllergenCodes: [], dietaryPreferenceCodes: ["UNKNOWN"] }, drop([], "NON_VEG"));
    expect(result.hasConflict).toBe(false);
  });
});

describe("evaluateAllergenConflict — combined", () => {
  it("reports both an allergen and a dietary conflict together", () => {
    const result = evaluateAllergenConflict(
      { avoidAllergenCodes: ["DAIRY"], dietaryPreferenceCodes: ["VEG"] },
      drop(["DAIRY"], "NON_VEG"),
    );
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingAllergens).toEqual(["DAIRY"]);
    expect(result.dietaryConflict).toBe("NON_VEG");
  });
});

describe("evaluateEnvelopeBounding — §19 fill within the template allergen envelope", () => {
  it("is within bounds when the fill uses a subset of the envelope", () => {
    const result = evaluateEnvelopeBounding(["DAIRY", "WHEAT_GLUTEN", "NUTS"], ["DAIRY", "NUTS"]);
    expect(result.withinEnvelope).toBe(true);
    expect(result.outOfEnvelope).toEqual([]);
  });

  it("flags a fill allergen not declared in the envelope", () => {
    const result = evaluateEnvelopeBounding(["DAIRY", "WHEAT_GLUTEN"], ["DAIRY", "SHELLFISH"]);
    expect(result.withinEnvelope).toBe(false);
    expect(result.outOfEnvelope).toEqual(["SHELLFISH"]);
  });

  it("reports every out-of-envelope allergen, deduped", () => {
    const result = evaluateEnvelopeBounding(["DAIRY"], ["FISH", "SHELLFISH", "FISH"]);
    expect(new Set(result.outOfEnvelope)).toEqual(new Set(["FISH", "SHELLFISH"]));
  });

  it("is case- and whitespace-insensitive on both sides", () => {
    const result = evaluateEnvelopeBounding([" dairy ", "Nuts"], ["DAIRY", "nuts"]);
    expect(result.withinEnvelope).toBe(true);
  });

  it("treats an empty fill as trivially within any envelope", () => {
    expect(evaluateEnvelopeBounding(["DAIRY"], []).withinEnvelope).toBe(true);
  });

  it("flags any fill when the envelope is empty", () => {
    const result = evaluateEnvelopeBounding([], ["DAIRY"]);
    expect(result.withinEnvelope).toBe(false);
    expect(result.outOfEnvelope).toEqual(["DAIRY"]);
  });
});

describe("labels", () => {
  it("formats allergen codes", () => {
    expect(formatAllergenLabel("WHEAT_GLUTEN")).toBe("Wheat gluten");
    expect(formatAllergenLabel("NUTS")).toBe("Nuts");
  });

  it("formats dietary codes", () => {
    expect(formatDietaryLabel("NON_VEG")).toBe("Non-veg");
    expect(formatDietaryLabel("JAIN")).toBe("Jain");
    expect(formatDietaryLabel("EGG_ONLY")).toBe("Egg only");
  });
});
