import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/restaurant-documents.json";
import { restaurantDocumentUploadRequestSchema } from "../index";
import { documentUploadTicketSchema, restaurantDocumentsDataSchema } from "./documents";
import { mobileEnvelopeSchema } from "./envelope";

describe("restaurant documents contract", () => {
  it("the fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    expect(restaurantDocumentsDataSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("carries status + rejection reason, and no signed bytes/urls in the list", () => {
    const data = restaurantDocumentsDataSchema.parse(fixture.data);
    const rejected = data.documents.find((d) => d.statusCode === "REJECTED");
    expect(rejected?.rejectionReason).toBeTruthy();
    // The list must never embed a signed URL or storage path (download is on-demand).
    const serialized = JSON.stringify(fixture.data);
    expect(serialized).not.toMatch(/token=/);
    expect(serialized).not.toMatch(/signedUrl/);
  });

  it("an upload request validates type/mime/size bounds; the ticket shape is fixed", () => {
    const ok = restaurantDocumentUploadRequestSchema.safeParse({
      restaurantPk: "20000000-0000-0000-0000-300000000001",
      documentTypeCode: "FSSAI_LICENSE",
      fileName: "fssai.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(ok.success).toBe(true);
    // Oversized + wrong mime are rejected by the canonical schema.
    expect(restaurantDocumentUploadRequestSchema.safeParse({ restaurantPk: "20000000-0000-0000-0000-300000000001", documentTypeCode: "FSSAI_LICENSE", fileName: "x.exe", mimeType: "application/x-msdownload", sizeBytes: 1024 }).success).toBe(false);
    expect(restaurantDocumentUploadRequestSchema.safeParse({ restaurantPk: "20000000-0000-0000-0000-300000000001", documentTypeCode: "FSSAI_LICENSE", fileName: "big.pdf", mimeType: "application/pdf", sizeBytes: 20 * 1024 * 1024 }).success).toBe(false);

    expect(documentUploadTicketSchema.safeParse({ documentPk: "d", bucket: "private-documents", path: "p", token: "t" }).success).toBe(true);
  });
});
