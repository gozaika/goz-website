import { describe, expect, it } from "vitest";
import { z } from "zod";
import { decodeEnvelope } from "./envelope";
import { ApiError } from "./errors";

const dataSchema = z.object({ name: z.string() });

describe("decodeEnvelope", () => {
  it("decodes a valid success envelope", () => {
    const result = decodeEnvelope(
      { ok: true, data: { name: "Bawarchi" }, requestId: "req-1", serverTime: "2026-06-19T10:00:00Z" },
      dataSchema,
      { status: 200 },
    );
    expect(result.data.name).toBe("Bawarchi");
    expect(result.requestId).toBe("req-1");
    expect(result.serverTime).toBe("2026-06-19T10:00:00Z");
  });

  it("throws a typed ApiError for an error envelope and maps the code", () => {
    expect.assertions(3);
    try {
      decodeEnvelope(
        { ok: false, error: { code: "ROLE_DENIED", message: "Not allowed", retryable: false }, requestId: "req-2" },
        dataSchema,
        { status: 403 },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("ROLE_DENIED");
      expect((error as ApiError).requestId).toBe("req-2");
    }
  });

  it("normalizes unknown error codes to SERVER_ERROR", () => {
    try {
      decodeEnvelope(
        { ok: false, error: { code: "WEIRD_CODE", message: "x", retryable: false } },
        dataSchema,
        { status: 500 },
      );
    } catch (error) {
      expect((error as ApiError).code).toBe("SERVER_ERROR");
    }
  });

  it("throws DECODE when the inner payload fails schema validation", () => {
    try {
      decodeEnvelope(
        { ok: true, data: { name: 123 }, requestId: "r", serverTime: "2026-06-19T10:00:00Z" },
        dataSchema,
        { status: 200 },
      );
    } catch (error) {
      expect((error as ApiError).code).toBe("DECODE");
    }
  });

  it("throws DECODE for a malformed envelope", () => {
    try {
      decodeEnvelope({ totally: "wrong" }, dataSchema, { status: 200 });
    } catch (error) {
      expect((error as ApiError).code).toBe("DECODE");
    }
  });
});
