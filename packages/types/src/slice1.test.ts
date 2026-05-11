import { describe, expect, it } from "vitest";
import {
  consentBatchCaptureSchema,
  consentPurposeCodes,
  consumerProfileUpdateSchema,
  profileBootstrapSchema,
} from "./index";

describe("Slice 1 auth/profile schemas", () => {
  it("uses the DPDP consent purpose set required by consumer onboarding", () => {
    expect(consentPurposeCodes).toEqual([
      "OPERATIONAL",
      "MARKETING",
      "ANALYTICS",
      "REFERRAL_COMMS",
      "WHATSAPP_TRANSACTIONAL",
      "WHATSAPP_MARKETING",
    ]);
  });

  it("validates profile bootstrap input", () => {
    expect(
      profileBootstrapSchema.parse({
        fullName: "Aarav Reddy",
        phoneE164: "919100200001",
        emailAddress: "aarav.reddy@gozaika.example",
      }),
    ).toMatchObject({ defaultCityCode: "HYD", phoneE164: "+919100200001", preferredLanguageCode: "en" });
  });

  it("ignores missing optional auth metadata during bootstrap", () => {
    expect(
      profileBootstrapSchema.parse({
        fullName: { unexpected: true },
        phoneE164: "",
        emailAddress: null,
      }),
    ).toMatchObject({ defaultCityCode: "HYD", preferredLanguageCode: "en" });
  });

  it("validates append-only consent capture batches", () => {
    expect(
      consentBatchCaptureSchema.parse({
        events: [
          {
            purposeCode: "OPERATIONAL",
            state: "GRANTED",
            source: "SIGNUP_FLOW",
            policyVersion: "2026-04-27",
          },
        ],
      }).events[0]?.proofJson,
    ).toEqual({});
  });

  it("rejects unsafe profile phone updates", () => {
    expect(() => consumerProfileUpdateSchema.parse({ phoneE164: "9100" })).toThrow();
  });
});
