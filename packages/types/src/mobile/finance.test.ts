import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/finance.json";
import { mobileEnvelopeSchema } from "./envelope";
import { financeDataSchema, financeSettlementWireSchema } from "./finance";

describe("finance contract", () => {
  it("the fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    expect(financeDataSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("a settlement validates and exposes only a masked payout account", () => {
    const s = fixture.data.settlements[0] as Record<string, unknown>;
    expect(financeSettlementWireSchema.safeParse(s).success).toBe(true);
    expect(s).not.toHaveProperty("payoutAccountNumber");
    expect(String(s.maskedPayoutAccount)).toContain("****");
  });
});
