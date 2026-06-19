import { describe, expect, it } from "vitest";
import errUpdate from "../../test-fixtures/mobile/error-app-update.json";
import errUnauth from "../../test-fixtures/mobile/error-unauthenticated.json";
import healthFixture from "../../test-fixtures/mobile/health.json";
import meConsumer from "../../test-fixtures/mobile/me-consumer.json";
import meRestaurant from "../../test-fixtures/mobile/me-restaurant.json";
import { mobileHealthSchema, mobileMeSchema } from "./dto";
import { mobileEnvelopeSchema, mobileErr, mobileErrorStatus, mobileOk } from "./envelope";

describe("mobile envelope builders", () => {
  it("mobileOk produces the canonical success shape", () => {
    expect(mobileOk({ a: 1 }, "req-1", "2026-06-19T10:00:00.000Z")).toEqual({
      ok: true,
      data: { a: 1 },
      requestId: "req-1",
      serverTime: "2026-06-19T10:00:00.000Z",
    });
  });

  it("mobileErr defaults retryable false and carries the code", () => {
    const e = mobileErr("ROLE_DENIED", "Not allowed", "req-2");
    expect(e.ok).toBe(false);
    expect(e.error.code).toBe("ROLE_DENIED");
    expect(e.error.retryable).toBe(false);
    expect(e.requestId).toBe("req-2");
  });

  it("maps codes to HTTP status", () => {
    expect(mobileErrorStatus("UNAUTHENTICATED")).toBe(401);
    expect(mobileErrorStatus("ROLE_DENIED")).toBe(403);
    expect(mobileErrorStatus("CONFLICT")).toBe(409);
    expect(mobileErrorStatus("APP_UPDATE_REQUIRED")).toBe(426);
    expect(mobileErrorStatus("SERVER_ERROR")).toBe(500);
  });
});

describe("shared fixtures conform to the canonical contract", () => {
  it("every fixture is a valid envelope", () => {
    for (const fixture of [healthFixture, meConsumer, meRestaurant, errUnauth, errUpdate]) {
      expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    }
  });

  it("health payload matches the health schema", () => {
    expect(mobileHealthSchema.safeParse(healthFixture.data).success).toBe(true);
  });

  it("me payloads match the me schema", () => {
    expect(mobileMeSchema.safeParse(meConsumer.data).success).toBe(true);
    expect(mobileMeSchema.safeParse(meRestaurant.data).success).toBe(true);
  });
});
