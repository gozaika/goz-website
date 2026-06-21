import { describe, expect, it } from "vitest";
import ordersFixture from "../../test-fixtures/mobile/counter-orders.json";
import verifyFixture from "../../test-fixtures/mobile/pickup-verify-success.json";
import { counterOrderWireSchema, counterOrdersDataSchema, pickupVerifyResultSchema } from "./counter";
import { mobileEnvelopeSchema } from "./envelope";

describe("counter contracts", () => {
  it("the orders fixture is a valid envelope", () => {
    expect(mobileEnvelopeSchema.safeParse(ordersFixture).success).toBe(true);
  });

  it("the queue payload validates against counterOrdersDataSchema", () => {
    expect(counterOrdersDataSchema.safeParse(ordersFixture.data).success).toBe(true);
  });

  it("a single queue row validates against counterOrderWireSchema", () => {
    expect(counterOrderWireSchema.safeParse(ordersFixture.data.orders[0]).success).toBe(true);
  });

  it("the pickup verify result validates against pickupVerifyResultSchema", () => {
    expect(mobileEnvelopeSchema.safeParse(verifyFixture).success).toBe(true);
    expect(pickupVerifyResultSchema.safeParse(verifyFixture.data).success).toBe(true);
  });
});
