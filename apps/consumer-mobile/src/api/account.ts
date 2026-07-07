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
import type { ConsumerSafetyPrefs } from "@gozaika/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "./client";

const safetyPrefsSchema = z.object({
  avoidAllergenCodes: z.array(z.string()),
  dietaryPreferenceCodes: z.array(z.string()),
});

const erasureResultSchema = z.object({
  status: z.string(),
  requestPk: z.string(),
  alreadyRequested: z.boolean(),
});
export type ErasureResult = z.infer<typeof erasureResultSchema>;

const accountProfileSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  preferredLanguageCode: z.string(),
  referralCode: z.string().nullable(),
  referralCounts: z.object({ total: z.number(), qualified: z.number(), rewarded: z.number() }),
});
export type AccountProfile = z.infer<typeof accountProfileSchema>;

export interface ProfileUpdateInput {
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly preferredLanguageCode?: "en" | "hi";
}

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

/** The signed-in consumer's saved allergen/dietary preferences (§16 allergen gate). */
export function useSafetyPrefs(enabled = true) {
  return useQuery({
    queryKey: ["account-safety-prefs"],
    enabled,
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<ConsumerSafetyPrefs> => {
      const res = await apiClient.request("/account/safety-preferences", { dataSchema: safetyPrefsSchema });
      return res.data as unknown as ConsumerSafetyPrefs;
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

/** The signed-in consumer's editable profile + referral summary. */
export function useAccountProfile() {
  return useQuery({
    queryKey: ["account-profile"],
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<AccountProfile> => {
      const res = await apiClient.request("/account/profile", { dataSchema: accountProfileSchema });
      return res.data as unknown as AccountProfile;
    },
  });
}

/** Update first/last name and preferred language. Returns the refreshed profile. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileUpdateInput): Promise<AccountProfile> => {
      const res = await apiClient.request("/account/profile", { method: "POST", body: input, dataSchema: accountProfileSchema });
      return res.data as unknown as AccountProfile;
    },
    onSuccess: (data) => queryClient.setQueryData(["account-profile"], data),
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
