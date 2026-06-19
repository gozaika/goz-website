import { describe, expect, it } from "vitest";
import { parseBearerToken } from "./index";

describe("parseBearerToken", () => {
  it("extracts the token from a Bearer header", () => {
    expect(parseBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("is case-insensitive on the scheme and trims", () => {
    expect(parseBearerToken("bearer   xyz  ")).toBe("xyz");
  });

  it("returns null for missing or malformed headers", () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken(undefined)).toBeNull();
    expect(parseBearerToken("")).toBeNull();
    expect(parseBearerToken("Token abc")).toBeNull();
    expect(parseBearerToken("Bearer")).toBeNull();
  });
});
