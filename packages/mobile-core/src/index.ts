// @gozaika/mobile-core — React-Native-safe shared mobile infrastructure.
// No navigation, copy, DOM or native imports: native concerns (SecureStore,
// network) are dependency-injected so this package is node-testable.

export * from "./config";

// HTTP / BFF client
export * from "./http/errors";
export * from "./http/envelope";
export * from "./http/headers";
export * from "./http/idempotency";
export * from "./http/serverTime";
export * from "./http/client";

// TanStack Query
export * from "./query/keys";
export * from "./query/defaults";

// Telemetry
export * from "./telemetry/redact";
export * from "./telemetry/logger";

// Storage (DI adapters)
export * from "./storage/session";
export * from "./storage/persistence";
