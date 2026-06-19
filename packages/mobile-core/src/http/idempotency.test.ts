import { describe, expect, it } from "vitest";
import { isUuid, newIdempotencyKey } from "./idempotency";

describe("idempotency keys", () => {
  it("generates valid, unique UUIDs", () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(isUuid(a)).toBe(true);
    expect(isUuid(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("rejects non-UUID strings", () => {
    expect(isUuid("nope")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});
