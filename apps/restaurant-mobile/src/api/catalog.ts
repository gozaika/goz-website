import { STALE_TIMES } from "@gozaika/mobile-core";
import {
  dropsDataSchema,
  publishDropResultSchema,
  templatesDataSchema,
  type DropsData,
  type PublishDropRequest,
  type PublishDropResult,
  type TemplatesData,
} from "@gozaika/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

function dropsKey(restaurantPk: string | null) {
  return ["portal", "drops", restaurantPk ?? "none"] as const;
}

export function useTemplates(restaurantPk: string | null) {
  return useQuery({
    queryKey: ["portal", "templates", restaurantPk ?? "none"] as const,
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<TemplatesData> => {
      const res = await apiClient.request("/templates", { dataSchema: templatesDataSchema, restaurantPk: restaurantPk ?? undefined });
      return res.data as unknown as TemplatesData;
    },
  });
}

export function useDrops(restaurantPk: string | null) {
  return useQuery({
    queryKey: dropsKey(restaurantPk),
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<DropsData> => {
      const res = await apiClient.request("/drops", { dataSchema: dropsDataSchema, restaurantPk: restaurantPk ?? undefined });
      return res.data as unknown as DropsData;
    },
  });
}

export function usePublishDrop(restaurantPk: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PublishDropRequest): Promise<PublishDropResult> => {
      const res = await apiClient.request("/drops", {
        method: "POST",
        body,
        restaurantPk: restaurantPk ?? undefined,
        dataSchema: publishDropResultSchema,
      });
      return res.data as unknown as PublishDropResult;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dropsKey(restaurantPk) }),
  });
}
