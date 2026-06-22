import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/consumer-orders.json";
import { mobileEnvelopeSchema } from "./envelope";
import { consumerOrderWireSchema, consumerOrdersDataSchema } from "./orders";

describe("consumer orders contract", () => {
  it("the fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    expect(consumerOrdersDataSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("a single order validates and carries no pickup OTP", () => {
    const o = fixture.data.orders[0] as Record<string, unknown>;
    expect(consumerOrderWireSchema.safeParse(o).success).toBe(true);
    expect(o).not.toHaveProperty("otp");
    expect(o).not.toHaveProperty("pickupOtp");
    expect(o).not.toHaveProperty("qrPayload");
  });
});
