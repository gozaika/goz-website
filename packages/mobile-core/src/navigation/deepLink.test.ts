import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./deepLink";

describe("safeInternalPath (push deep-link guard)", () => {
  it("accepts in-app absolute paths", () => {
    expect(safeInternalPath("/orders/123")).toBe("/orders/123");
    expect(safeInternalPath("/(tabs)/orders")).toBe("/(tabs)/orders");
    expect(safeInternalPath("/drops/abc?focus=1")).toBe("/drops/abc?focus=1");
    expect(safeInternalPath("  /account/passport  ")).toBe("/account/passport");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("http://evil.com/orders")).toBeNull();
  });

  it("rejects custom schemes and javascript", () => {
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
    expect(safeInternalPath("/javascript:alert(1)")).toBeNull();
    expect(safeInternalPath("gozaika://orders/1")).toBeNull();
    expect(safeInternalPath("/mailto:x@y.z")).toBeNull();
  });

  it("rejects relative paths, backslashes, control chars, and non-strings", () => {
    expect(safeInternalPath("orders/123")).toBeNull();
    expect(safeInternalPath("/orders\\..\\secret")).toBeNull();
    expect(safeInternalPath("/orders\n/evil")).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath(42)).toBeNull();
    expect(safeInternalPath("/" + "a".repeat(600))).toBeNull();
  });
});
