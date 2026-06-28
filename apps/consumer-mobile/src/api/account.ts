import { queryKeys, STALE_TIMES } from "@gozaika/mobile-core";
import {
  consentSettingsDataSchema,
  discoveryProfileSchema,
  zaykaPassportPayloadSchema,
  type ConsentPurposeCode,
  type ConsentSettingsData,
  type ConsentStateCode,
  type DiscoveryProfile,
  type ZaykaPassportPayload,
} from "@gozaika/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "./client";

const erasureResultSchema = z.object({
  status: z.string(),
  requestPk: z.string(),
  alreadyRequested: z.boolean(),
});
export type ErasureResult = z.infer<typeof erasureResultSchema>;

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

/** The signed-in consumer's DPDP consent settings (all purposes + latest state). */
export function useConsentSettings() {
  return useQuery({
    queryKey: queryKeys.account.consent(),
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<ConsentSettingsData> => {
      const res = await apiClient.request("/account/consent", { dataSchema: consentSettingsDataSchema });
      return res.data as unknown as ConsentSettingsData;
    },
  });
}

/** Toggle one consent purpose. The server stamps the policy version + source and
 *  returns the refreshed settings, which we write straight into the cache. */
export function useUpdateConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { readonly purposeCode: ConsentPurposeCode; readonly state: ConsentStateCode }): Promise<ConsentSettingsData> => {
      const res = await apiClient.request("/account/consent", { method: "POST", body: input, dataSchema: consentSettingsDataSchema });
      return res.data as unknown as ConsentSettingsData;
    },
    onSuccess: (data) => queryClient.setQueryData(queryKeys.account.consent(), data),
  });
}

/** Submit an in-app account/data erasure request (DPDP). Idempotent server-side. */
export function useRequestErasure() {
  return useMutation({
    mutationFn: async (): Promise<ErasureResult> => {
      const res = await apiClient.request("/account/erasure", { method: "POST", body: {}, dataSchema: erasureResultSchema });
      return res.data as unknown as ErasureResult;
    },
  });
}
