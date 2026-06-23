import { STALE_TIMES } from "@gozaika/mobile-core";
import {
  documentSignedUrlSchema,
  documentUploadTicketSchema,
  restaurantDocumentsDataSchema,
  type DocumentUploadTicket,
  type RestaurantDocumentsData,
  type RestaurantDocumentTypeCode,
} from "@gozaika/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/auth/supabase";
import { apiClient } from "./client";

const documentsKey = (restaurantPk: string) => ["portal", "documents", restaurantPk] as const;

/** Compliance documents for the selected restaurant (manageCompliance). */
export function useDocuments(restaurantPk: string | null) {
  return useQuery({
    queryKey: documentsKey(restaurantPk ?? "none"),
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<RestaurantDocumentsData> => {
      const res = await apiClient.request("/restaurant/documents", {
        dataSchema: restaurantDocumentsDataSchema,
        restaurantPk: restaurantPk ?? undefined,
      });
      return res.data as unknown as RestaurantDocumentsData;
    },
  });
}

export interface DocumentUploadInput {
  readonly restaurantPk: string;
  readonly documentTypeCode: RestaurantDocumentTypeCode;
  readonly fileName: string;
  readonly mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  readonly sizeBytes: number;
  readonly uri: string;
  readonly documentNumber?: string;
  readonly expiresAt?: string;
}

/**
 * Two-step upload: ask the BFF for a short-lived signed-upload ticket, then PUT the
 * file bytes straight to the private bucket via the signed URL (the bytes never
 * pass through our server). The document is recorded PENDING_REVIEW server-side.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DocumentUploadInput): Promise<DocumentUploadTicket> => {
      const res = await apiClient.request("/restaurant/documents", {
        method: "POST",
        body: {
          restaurantPk: input.restaurantPk,
          documentTypeCode: input.documentTypeCode,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          documentNumber: input.documentNumber,
          expiresAt: input.expiresAt,
        },
        dataSchema: documentUploadTicketSchema,
        restaurantPk: input.restaurantPk,
      });
      const ticket = res.data as unknown as DocumentUploadTicket;

      const fileBody = await (await fetch(input.uri)).blob();
      const { error } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, fileBody, { contentType: input.mimeType });
      if (error) {
        throw new Error(error.message);
      }
      return ticket;
    },
    onSuccess: (_ticket, input) => queryClient.invalidateQueries({ queryKey: documentsKey(input.restaurantPk) }),
  });
}

/** Fetch a fresh short-lived signed download URL for one document (open on demand). */
export async function fetchDocumentSignedUrl(restaurantPk: string, documentPk: string): Promise<string> {
  const res = await apiClient.request(`/restaurant/documents/${documentPk}/signed-url`, {
    dataSchema: documentSignedUrlSchema,
    restaurantPk,
  });
  return (res.data as unknown as { signedUrl: string }).signedUrl;
}
