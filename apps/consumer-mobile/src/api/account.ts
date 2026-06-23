import { queryKeys, STALE_TIMES } from "@gozaika/mobile-core";
import {
  discoveryProfileSchema,
  zaykaPassportPayloadSchema,
  type DiscoveryProfile,
  type ZaykaPassportPayload,
} from "@gozaika/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

/** The signed-in consumer's Zayka Passport (tier card, bags, badges). */
export function usePassport() {
  return useQuery({
    queryKey: queryKeys.account.passport(),
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<ZaykaPassportPayload> => {
      const res = await apiClient.request("/account/passport", { dataSchema: zaykaPassportPayloadSchema });
      return res.data as unknown as ZaykaPassportPayload;
    },
  });
}

/** The signed-in consumer's Flavour-Diversity discovery profile. */
export function useDiscoveryProfile() {
  return useQuery({
    queryKey: queryKeys.account.discoveryProfile(),
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<DiscoveryProfile> => {
      const res = await apiClient.request("/account/discovery-profile", { dataSchema: discoveryProfileSchema });
      return res.data as unknown as DiscoveryProfile;
    },
  });
}
