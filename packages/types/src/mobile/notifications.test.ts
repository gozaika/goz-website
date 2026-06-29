import { describe, expect, it } from "vitest";
import { deviceRegisterRequestSchema, deviceRegisterResultSchema } from "./notifications";

describe("notification device registration contract (Slice 16)", () => {
  it("accepts a valid registration and normalizes an empty label to null", () => {
    const parsed = deviceRegisterRequestSchema.parse({ pushToken: "ExponentPushToken[abc123]", platform: "ANDROID", deviceLabel: "" });
    expect(parsed.platform).toBe("ANDROID");
    expect(parsed.deviceLabel).toBeNull();
  });

  it("rejects an unknown platform and a too-short token", () => {
    expect(deviceRegisterRequestSchema.safeParse({ pushToken: "tok-aaaa", platform: "DESKTOP" }).success).toBe(false);
    expect(deviceRegisterRequestSchema.safeParse({ pushToken: "short", platform: "ANDROID" }).success).toBe(false);
  });

  it("validates the result shape", () => {
    expect(deviceRegisterResultSchema.safeParse({ deviceId: "11111111-1111-1111-1111-111111111111", active: true }).success).toBe(true);
    expect(deviceRegisterResultSchema.safeParse({ deviceId: 1, active: true }).success).toBe(false);
  });
});
