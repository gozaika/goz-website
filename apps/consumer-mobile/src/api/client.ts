import { createApiClient, createLogger, createServerClock, type MobilePlatform } from "@gozaika/mobile-core";
import { Platform } from "react-native";
import { supabase } from "@/auth/supabase";

const apiOrigin = process.env.EXPO_PUBLIC_CUSTOMER_API_ORIGIN ?? "";
const platform: MobilePlatform = Platform.OS === "android" ? "android" : "ios";

/** Shared server-time offset clock (kept in sync from each response). */
export const serverClock = createServerClock();

/** Customer BFF client. Public discovery needs no token; auth is attached when present. */
export const apiClient = createApiClient({
  config: { apiOrigin, appId: "gozaika-customer", appVersion: "0.1.0", platform, schemaVersion: 1 },
  getAccessToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
  serverClock,
  logger: createLogger({ minLevel: "warn" }),
});
