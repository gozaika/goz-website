import { counterOrdersDataSchema, mobileHealthSchema, mobileMeSchema, pickupVerifyResultSchema } from "@gozaika/types";
import { describe, expect, it } from "vitest";
import counterOrders from "../../../types/test-fixtures/mobile/counter-orders.json";
import errUpdate from "../../../types/test-fixtures/mobile/error-app-update.json";
import errUnauth from "../../../types/test-fixtures/mobile/error-unauthenticated.json";
import health from "../../../types/test-fixtures/mobile/health.json";
import meConsumer from "../../../types/test-fixtures/mobile/me-consumer.json";
import pickupVerify from "../../../types/test-fixtures/mobile/pickup-verify-success.json";
import { decodeEnvelope } from "./envelope";
import { ApiError } from "./errors";

// The client decoder consumes the SAME fixtures the server contract test validates,
// so any wire-shape drift fails here automatically.
describe("mobile-core decodes the canonical fixtures", () => {
  it("decodes the consumer me payload", () => {
    const result = decodeEnvelope(meConsumer, mobileMeSchema, { status: 200 });
    expect(result.data.actor.isConsumer).toBe(true);
    expect(result.data.surface).toBe("gozaika-customer");
    expect(result.requestId).toBe(meConsumer.requestId);
  });

  it("decodes the health payload", () => {
    const result = decodeEnvelope(health, mobileHealthSchema, { status: 200 });
    expect(result.data.status).toBe("ok");
    expect(result.data.schemaVersion).toBe(1);
  });

  it("maps an error envelope to a typed ApiError", () => {
    expect.assertions(2);
    try {
      decodeEnvelope(errUnauth, mobileMeSchema, { status: 401 });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("UNAUTHENTICATED");
    }
  });

  it("flags APP_UPDATE_REQUIRED from the wire", () => {
    expect.assertions(1);
    try {
      decodeEnvelope(errUpdate, mobileMeSchema, { status: 426 });
    } catch (error) {
      expect((error as ApiError).requiresAppUpdate).toBe(true);
    }
  });

  it("decodes the restaurant counter queue payload", () => {
    const result = decodeEnvelope(counterOrders, counterOrdersDataSchema, { status: 200 });
    expect(result.data.orders).toHaveLength(2);
    expect(result.data.orders[0]?.orderStatusCode).toBe("READY_FOR_PICKUP");
  });

  it("decodes the pickup verification result payload", () => {
    const result = decodeEnvelope(pickupVerify, pickupVerifyResultSchema, { status: 200 });
    expect(result.data.resultCode).toBe("SUCCESS");
    expect(result.data.orderStatusCode).toBe("COLLECTED");
  });
});
