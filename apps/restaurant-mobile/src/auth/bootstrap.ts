import { createApiClient, createServerClock, noopLogger, type MobilePlatform } from "@gozaika/mobile-core";
import { mobileRestaurantBootstrapSchema, type MobileMembershipDto } from "@gozaika/types";
import { Platform } from "react-native";

export interface RestaurantBootstrapResult {
  readonly memberships: readonly MobileMembershipDto[];
  readonly selectedRestaurantPk: string | null;
}

/**
 * Best-effort restaurant membership bootstrap after sign-in (uses the Slice 4
 * POST /api/mobile/v1/auth/bootstrap). Returns null if the API origin is unset or
 * the call fails; the caller treats that as "no memberships resolved yet".
 */
export async function fetchRestaurantBootstrap(accessToken: string): Promise<RestaurantBootstrapResult | null> {
  const apiOrigin = process.env.EXPO_PUBLIC_RESTAURANT_API_ORIGIN;
  if (!apiOrigin) {
    return null;
  }

  const platform: MobilePlatform = Platform.OS === "android" ? "android" : "ios";
  const client = createApiClient({
    config: { apiOrigin, appId: "gozaika-restaurant", appVersion: "0.1.0", platform, schemaVersion: 1 },
    getAccessToken: () => accessToken,
    serverClock: createServerClock(),
    logger: noopLogger,
  });

  try {
    const res = await client.request("/auth/bootstrap", {
      method: "POST",
      body: {},
      dataSchema: mobileRestaurantBootstrapSchema,
    });
    // Wire schema keeps codes as strings (resilient); narrow to the DTO union at
    // this single boundary — the server only emits valid role/status codes.
    const memberships = res.data.memberships as unknown as readonly MobileMembershipDto[];
    return { memberships, selectedRestaurantPk: res.data.selectedRestaurantPk };
  } catch {
    return null;
  }
}
