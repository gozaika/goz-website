// Partner-primitive decision logic now lives in the framework-neutral
// @gozaika/utils (shared with the web ports), re-exported here so
// @gozaika/mobile-ui's public API and internal imports
// (`./partnerPrimitivesModel`) are unchanged.
export { clampRatio, basisPointsToRatio, formatRatioPercent, normalizeSparkline } from "@gozaika/utils";
