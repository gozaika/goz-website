import { describe, expect, it } from "vitest";
import { isSensitiveKey, redact } from "./redact";

describe("redact", () => {
  it("flags sensitive keys", () => {
    expect(isSensitiveKey("Authorization")).toBe(true);
    expect(isSensitiveKey("access_token")).toBe(true);
    expect(isSensitiveKey("phone")).toBe(true);
    expect(isSensitiveKey("otp")).toBe(true);
    expect(isSensitiveKey("latitude")).toBe(true);
    expect(isSensitiveKey("method")).toBe(false);
    expect(isSensitiveKey("status")).toBe(false);
  });

  it("redacts sensitive values but keeps structure", () => {
    const out = redact({
      method: "POST",
      Authorization: "Bearer abc",
      nested: { phone: "+919876510001", note: "ok", qrPayload: "secret" },
      items: [{ token: "t" }, { id: 1 }],
    }) as Record<string, unknown>;

    expect(out.method).toBe("POST");
    expect(out.Authorization).toBe("[redacted]");
    const nested = out.nested as Record<string, unknown>;
    expect(nested.phone).toBe("[redacted]");
    expect(nested.note).toBe("ok");
    expect(nested.qrPayload).toBe("[redacted]");
    const items = out.items as Record<string, unknown>[];
    expect(items[0]?.token).toBe("[redacted]");
    expect(items[1]?.id).toBe(1);
  });

  it("passes through primitives", () => {
    expect(redact("hello")).toBe("hello");
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
  });
});
