import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { MobileAppConfig } from "../config";
import { noopLogger } from "../telemetry/logger";
import { createApiClient } from "./client";
import { ApiError } from "./errors";
import { createServerClock } from "./serverTime";

const config: MobileAppConfig = {
  apiOrigin: "https://customer.gozaika.in",
  appId: "gozaika-customer",
  appVersion: "0.1.0",
  platform: "ios",
  schemaVersion: 1,
};

const dataSchema = z.object({ name: z.string() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "req-xyz" },
  });
}

describe("createApiClient", () => {
  it("decodes a success response and syncs the server clock", async () => {
    const serverClock = createServerClock(() => 0);
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: true, data: { name: "Sattvik" }, requestId: "req-1", serverTime: new Date(5000).toISOString() }),
    );
    const client = createApiClient({ config, getAccessToken: () => "tok", serverClock, logger: noopLogger, fetchImpl });

    const result = await client.request("/discovery/drops", { dataSchema });
    expect(result.data.name).toBe("Sattvik");
    expect(serverClock.offsetMs).toBe(5000);

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://customer.gozaika.in/api/mobile/v1/discovery/drops");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("auto-generates an idempotency key for writes", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: true, data: { name: "x" }, requestId: "r", serverTime: new Date().toISOString() }),
    );
    const client = createApiClient({
      config,
      getAccessToken: () => null,
      serverClock: createServerClock(),
      logger: noopLogger,
      fetchImpl,
    });

    await client.request("/claims", { method: "POST", body: { dropPk: "d1" }, dataSchema });
    const init = fetchImpl.mock.calls[0]![1]!;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws a typed ApiError for an error envelope", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: false, error: { code: "CONFLICT", message: "Sold out", retryable: false } }, 409),
    );
    const client = createApiClient({
      config,
      getAccessToken: () => "t",
      serverClock: createServerClock(),
      logger: noopLogger,
      fetchImpl,
    });

    await expect(client.request("/claims", { method: "POST", body: {}, dataSchema })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("maps network failures to a retryable NETWORK error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    const client = createApiClient({
      config,
      getAccessToken: () => null,
      serverClock: createServerClock(),
      logger: noopLogger,
      fetchImpl,
    });

    try {
      await client.request("/discovery/drops", { dataSchema });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("NETWORK");
      expect((error as ApiError).retryable).toBe(true);
    }
  });
});
