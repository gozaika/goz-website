import { z } from "zod";
import type { RestaurantDocumentStatusCode, RestaurantDocumentTypeCode } from "../index";

/**
 * Restaurant compliance document contracts (Slice 12). Private, regulated
 * documents (FSSAI / GST / PAN / cheque / audit / ID) live in the non-public
 * `private-documents` bucket; the BFF only ever returns metadata + short-lived
 * signed URLs, never bytes. Code fields stay permissive (`z.string()`) on the
 * wire. Gated by `manageCompliance` (OWNER/ADMIN). Upload requests reuse the
 * canonical `restaurantDocumentUploadRequestSchema` from the package root.
 */

export const restaurantDocumentWireSchema = z.object({
  documentPk: z.string(),
  documentTypeCode: z.string(),
  documentTypeName: z.string().nullable(),
  statusCode: z.string(),
  documentNumber: z.string().nullable(),
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  originalFilename: z.string().nullable(),
  mimeType: z.string().nullable(),
  uploadedAt: z.string(),
});

export const restaurantDocumentsDataSchema = z.object({
  documents: z.array(restaurantDocumentWireSchema),
});

/** Signed-upload ticket returned by POST (client uploads via uploadToSignedUrl). */
export const documentUploadTicketSchema = z.object({
  documentPk: z.string(),
  bucket: z.string(),
  path: z.string(),
  token: z.string(),
});

/** Short-lived signed download link for one document. */
export const documentSignedUrlSchema = z.object({ signedUrl: z.string() });

export interface RestaurantDocumentDto {
  readonly documentPk: string;
  readonly documentTypeCode: RestaurantDocumentTypeCode | string;
  readonly documentTypeName: string | null;
  readonly statusCode: RestaurantDocumentStatusCode | string;
  readonly documentNumber: string | null;
  readonly issuedAt: string | null;
  readonly expiresAt: string | null;
  readonly rejectionReason: string | null;
  readonly originalFilename: string | null;
  readonly mimeType: string | null;
  readonly uploadedAt: string;
}
export interface RestaurantDocumentsData {
  readonly documents: readonly RestaurantDocumentDto[];
}
export interface DocumentUploadTicket {
  readonly documentPk: string;
  readonly bucket: string;
  readonly path: string;
  readonly token: string;
}
