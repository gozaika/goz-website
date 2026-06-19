import { describe, expect, it } from "vitest";
import type { MobileAppConfig } from "../config";
import { buildHeaders } from "./headers";

const config: MobileAppConfig = {
  apiOrigin: "https://customer.gozaika.in",
  appId: "gozaika-customer",
  appVersion: "0.1.0",
  platform: "ios",
  schemaVersion: 1,
};

describe("buildHeaders", () => {
  it("sets identity headers and omits auth/body headers when not provided", () => {
    const h = buildHeaders({ config });
    expect(h["X-GoZaika-App"]).toBe("gozaika-customer");
    expect(h["X-GoZaika-App-Version"]).toBe("0.1.0");
    expect(h["X-GoZaika-Platform"]).toBe("ios");
    expect(h["X-Client-Schema-Version"]).toBe("1");
    expect(h.Authorization).toBeUndefined();
    expect(h["Content-Type"]).toBeUndefined();
  });

  it("adds bearer, idempotency, restaurant and content-type when present", () => {
    const h = buildHeaders({
      config,
      accessToken: "tok",
      idempotencyKey: "idem-1",
      restaurantPk: "rest-1",
      hasBody: true,
    });
    expect(h.Authorization).toBe("Bearer tok");
    expect(h["X-Idempotency-Key"]).toBe("idem-1");
    expect(h["X-GoZaika-Restaurant"]).toBe("rest-1");
    expect(h["Content-Type"]).toBe("application/json");
  });
});
