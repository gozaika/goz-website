import { describe, expect, it } from "vitest";
import { ApiError, isRetryableCode, statusToErrorCode } from "./errors";

describe("statusToErrorCode", () => {
  it.each([
    [401, "UNAUTHENTICATED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [426, "APP_UPDATE_REQUIRED"],
    [429, "RATE_LIMITED"],
    [500, "SERVER_ERROR"],
    [503, "SERVER_ERROR"],
  ])("maps %i -> %s", (status, code) => {
    expect(statusToErrorCode(status)).toBe(code);
  });
});

describe("ApiError flags", () => {
  it("flags APP_UPDATE_REQUIRED", () => {
    expect(new ApiError({ code: "APP_UPDATE_REQUIRED", message: "x", retryable: false }).requiresAppUpdate).toBe(true);
  });
  it("flags UNAUTHENTICATED as reauth", () => {
    expect(new ApiError({ code: "UNAUTHENTICATED", message: "x", retryable: false }).requiresReauth).toBe(true);
  });
});

describe("isRetryableCode", () => {
  it("retries network/server/rate-limit only", () => {
    expect(isRetryableCode("NETWORK")).toBe(true);
    expect(isRetryableCode("SERVER_ERROR")).toBe(true);
    expect(isRetryableCode("RATE_LIMITED")).toBe(true);
    expect(isRetryableCode("CONFLICT")).toBe(false);
    expect(isRetryableCode("UNAUTHENTICATED")).toBe(false);
  });
});
