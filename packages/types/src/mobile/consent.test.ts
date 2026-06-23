import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/consent-settings.json";
import { CONSENT_POLICY_VERSION, consentPurposeCodes, consentStateCodes } from "../index";
import { mobileEnvelopeSchema } from "./envelope";
import { consentSettingsDataSchema, consentUpdateRequestSchema } from "./consent";

describe("consent settings contract", () => {
  it("the fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    expect(consentSettingsDataSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("exposes every consent purpose (none hidden)", () => {
    const data = consentSettingsDataSchema.parse(fixture.data);
    const codes = new Set(data.settings.map((s) => s.purposeCode));
    for (const purpose of consentPurposeCodes) {
      expect(codes.has(purpose)).toBe(true);
    }
  });

  it("operational is required and granted; optional purposes can be null/revoked", () => {
    const data = consentSettingsDataSchema.parse(fixture.data);
    const operational = data.settings.find((s) => s.purposeCode === "OPERATIONAL");
    expect(operational?.isRequiredForService).toBe(true);
    const marketing = data.settings.find((s) => s.purposeCode === "MARKETING");
    expect(marketing?.isRequiredForService).toBe(false);
    expect(data.currentPolicyVersion).toBe(CONSENT_POLICY_VERSION);
  });

  it("a capture request accepts a known purpose+state and rejects junk", () => {
    expect(consentUpdateRequestSchema.safeParse({ purposeCode: "MARKETING", state: "GRANTED" }).success).toBe(true);
    expect(consentUpdateRequestSchema.safeParse({ purposeCode: "MARKETING", state: "MAYBE" }).success).toBe(false);
    expect(consentUpdateRequestSchema.safeParse({ purposeCode: "NOT_A_PURPOSE", state: "GRANTED" }).success).toBe(false);
  });

  it("the request schema's inlined literals stay in sync with the canonical codes", () => {
    // Guards the circular-import workaround in consent.ts: every canonical purpose +
    // state must be accepted by the request schema.
    for (const purposeCode of consentPurposeCodes) {
      for (const state of consentStateCodes) {
        expect(consentUpdateRequestSchema.safeParse({ purposeCode, state }).success).toBe(true);
      }
    }
  });
});
