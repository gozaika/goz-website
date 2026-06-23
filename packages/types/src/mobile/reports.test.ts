import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/roi-report.json";
import { mobileEnvelopeSchema } from "./envelope";
import { roiReportPayloadSchema } from "./reports";

describe("roi report contract", () => {
  it("the fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    expect(roiReportPayloadSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("carries metric cards, drop rows, exceptions and partner copy", () => {
    const payload = roiReportPayloadSchema.parse(fixture.data);
    expect(payload.summary.metricCards.length).toBeGreaterThanOrEqual(6);
    expect(payload.dropRows.length).toBeGreaterThan(0);
    expect(payload.partnerCopy.summaryLines.length).toBeGreaterThan(0);
  });

  it("partner copy carries no consumer PII (counts only)", () => {
    const serialized = JSON.stringify(fixture.data.partnerCopy);
    // Buyer signal lines are counts; no phone/email markers should appear.
    expect(serialized).not.toMatch(/\+91\d{10}/);
    expect(serialized).not.toMatch(/@/);
  });

  it("accepts an unknown future tone/insight code (permissive wire)", () => {
    const data = JSON.parse(JSON.stringify(fixture.data));
    data.summary.metricCards[0].tone = "spectacular";
    data.summary.insightCodes.push("BRAND_NEW_INSIGHT");
    expect(roiReportPayloadSchema.safeParse(data).success).toBe(true);
  });
});
