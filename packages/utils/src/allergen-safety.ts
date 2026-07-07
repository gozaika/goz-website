/**
 * Product-level allergen / dietary conflict evaluation — the pure model behind
 * the §16 "allergen-conflict gate" that warns a customer before they claim a bag
 * whose disclosed allergen envelope collides with their saved preferences.
 *
 * Kept here in `@gozaika/utils` so the consumer web claim panel and the consumer
 * mobile claim flow share ONE source of truth and can never drift on what counts
 * as a conflict. Allergens are a safety/legal matter (potentially fatal), so this
 * is deliberately conservative: any overlap between a customer's avoided allergens
 * and the bag's disclosed allergens is a conflict, and variety bags disclose the
 * *union* of every SKU's allergens, so the envelope is already wide.
 *
 * The gate is advisory (warn + explicit acknowledgement) — this model only decides
 * *whether* to warn and *what* to name; it never blocks on its own.
 */

/** A customer's saved safety preferences (all codes upper-cased, deduped by caller). */
export interface ConsumerSafetyPrefs {
  /** Allergen codes the customer wants to avoid (from consumer_allergen_preference, avoid_flag = true). */
  readonly avoidAllergenCodes: readonly string[];
  /** Dietary categories the customer accepts (from consumer_dietary_preference), e.g. VEG / JAIN. */
  readonly dietaryPreferenceCodes: readonly string[];
}

/** The safety-relevant slice of a drop needed to evaluate a conflict. */
export interface DropSafetyProfile {
  /** Disclosed allergen codes (union across all SKUs + may-contain). */
  readonly allergenCodes: readonly string[];
  /** The bag's single dietary category. */
  readonly dietaryCategoryCode: string;
}

export interface AllergenConflictResult {
  /** True when there is any allergen or dietary conflict worth warning about. */
  readonly hasConflict: boolean;
  /** Allergen codes the customer avoids that the bag discloses (upper-cased). */
  readonly conflictingAllergens: readonly string[];
  /**
   * The bag's dietary category when it is incompatible with every one of the
   * customer's dietary preferences, else null. (null when the customer has no
   * dietary preference, or the bag is acceptable to at least one of them.)
   */
  readonly dietaryConflict: string | null;
}

/**
 * Which drop dietary categories each customer preference will accept. A customer
 * who marks themselves VEG accepts VEG and JAIN bags (JAIN is stricter-veg); a
 * JAIN customer accepts only JAIN; an eggetarian (EGG_ONLY) accepts vegetarian
 * and egg bags; a NON_VEG customer imposes no restriction. Unknown preference
 * codes are treated as "accepts anything" (fail open — never fabricate a warning).
 */
const DIETARY_ACCEPTS: Readonly<Record<string, ReadonlySet<string>>> = {
  VEG: new Set(["VEG", "JAIN"]),
  JAIN: new Set(["JAIN"]),
  EGG_ONLY: new Set(["VEG", "JAIN", "EGG_ONLY"]),
  NON_VEG: new Set(["VEG", "NON_VEG", "JAIN", "EGG_ONLY"]),
};

function normalise(codes: readonly string[]): string[] {
  return [...new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean))];
}

/**
 * Evaluate whether claiming `drop` conflicts with the customer's saved `prefs`.
 * Pure and side-effect-free. Both allergen and dietary checks are conservative
 * but fail open on unknown/empty inputs so we never invent a warning.
 */
export function evaluateAllergenConflict(
  prefs: ConsumerSafetyPrefs,
  drop: DropSafetyProfile,
): AllergenConflictResult {
  const avoid = new Set(normalise(prefs.avoidAllergenCodes));
  const dropAllergens = normalise(drop.allergenCodes);
  const conflictingAllergens = dropAllergens.filter((code) => avoid.has(code));

  const dietaryPrefs = normalise(prefs.dietaryPreferenceCodes);
  const dropDietary = drop.dietaryCategoryCode.trim().toUpperCase();
  // A conflict only when the customer has dietary preferences AND the bag is
  // acceptable to none of them. An unknown preference accepts anything.
  const acceptedBySome =
    dietaryPrefs.length === 0 ||
    dietaryPrefs.some((pref) => {
      const accepts = DIETARY_ACCEPTS[pref];
      return !accepts || accepts.has(dropDietary);
    });
  const dietaryConflict = dietaryPrefs.length > 0 && !acceptedBySome ? dropDietary : null;

  return {
    hasConflict: conflictingAllergens.length > 0 || dietaryConflict !== null,
    conflictingAllergens,
    dietaryConflict,
  };
}

/**
 * §19 template-vs-drop safety invariant. A template declares an *allergen envelope*
 * (the union of anything that could ever be in this archetype). At drop time the
 * restaurant fills the archetype from today's surplus; that fill's allergens MUST
 * stay inside the declared envelope.
 *
 * Why this is the guardrail (ties to §16): a customer only ever sees the template's
 * envelope disclosure, and the §16 conflict gate warns/blocks against that envelope.
 * So a same-envelope swap can never violate a customer's disclosed allergens, while
 * an out-of-envelope fill introduces an *undisclosed* allergen and must be flagged so
 * the restaurant either re-declares the envelope (new revision) or excludes the item.
 *
 * Pure and conservative: any fill allergen not present in the envelope is out-of-bounds.
 * Empty fill is trivially within any envelope.
 */
export interface EnvelopeBoundingResult {
  /** True when every fill allergen is covered by the declared envelope. */
  readonly withinEnvelope: boolean;
  /** Fill allergen codes NOT covered by the envelope (upper-cased, deduped). */
  readonly outOfEnvelope: readonly string[];
}

export function evaluateEnvelopeBounding(
  envelopeCodes: readonly string[],
  fillCodes: readonly string[],
): EnvelopeBoundingResult {
  const envelope = new Set(normalise(envelopeCodes));
  const outOfEnvelope = normalise(fillCodes).filter((code) => !envelope.has(code));
  return { withinEnvelope: outOfEnvelope.length === 0, outOfEnvelope };
}

/** Human-readable allergen label, e.g. WHEAT_GLUTEN -> "Wheat gluten". */
export function formatAllergenLabel(code: string): string {
  const cleaned = code.trim().replaceAll("_", " ").toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Human-readable dietary label, e.g. NON_VEG -> "Non-veg". */
export function formatDietaryLabel(code: string): string {
  switch (code.trim().toUpperCase()) {
    case "VEG":
      return "Vegetarian";
    case "NON_VEG":
      return "Non-veg";
    case "JAIN":
      return "Jain";
    case "EGG_ONLY":
      return "Egg only";
    default:
      return formatAllergenLabel(code);
  }
}
