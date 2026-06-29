// Customer-primitive decision logic now lives in the framework-neutral
// @gozaika/utils (shared with the web ports), re-exported here so
// @gozaika/mobile-ui's public API and internal imports
// (`./customerPrimitivesModel`) are unchanged.
export { clampProgress, progressPercent, formatCountdownParts, type CountdownParts } from "@gozaika/utils";
