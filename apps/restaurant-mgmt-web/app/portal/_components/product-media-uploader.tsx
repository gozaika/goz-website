"use client";

import type { ProductMediaTargetCode, PublicMediaAsset } from "@gozaika/types";
import { safeErrorMessage } from "@gozaika/utils";
import { ImageUp, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type UploadTicket = {
  readonly uploadPk: string;
  readonly bucket: string;
  readonly path: string;
  readonly token: string;
};

export function ProductMediaUploader({
  restaurantPk,
  dropPk,
  targetCode,
  label,
  guidance,
  initialMedia,
}: {
  readonly restaurantPk: string;
  readonly dropPk?: string | null;
  readonly targetCode: ProductMediaTargetCode;
  readonly label: string;
  readonly guidance: string;
  readonly initialMedia: PublicMediaAsset | null;
}) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState(initialMedia?.alt ?? "");
  const [media, setMedia] = useState(initialMedia);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return setStatus("Choose a JPEG, PNG, or WebP image first.");
    if (!altText.trim()) return setStatus("Add a short visual description for accessibility.");
    if (file.size > 8 * 1024 * 1024) return setStatus("Choose an image no larger than 8 MB.");

    setBusy(true);
    setStatus("Preparing secure upload...");
    try {
      const signResponse = await fetch("/api/portal/media/sign-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          restaurantPk,
          dropPk: dropPk ?? null,
          targetCode,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          altText: altText.trim(),
        }),
      });
      const signPayload = (await signResponse.json()) as { ok: boolean; data?: UploadTicket; error?: string };
      if (!signResponse.ok || !signPayload.data) throw new Error(signPayload.error ?? "Could not prepare upload.");

      setStatus("Uploading privately...");
      const ticket = signPayload.data;
      const { error: uploadError } = await createClient().storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      setStatus("Verifying and optimizing image...");
      const completeResponse = await fetch("/api/portal/media/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadPk: ticket.uploadPk }),
      });
      const completePayload = (await completeResponse.json()) as {
        ok: boolean;
        data?: { media: PublicMediaAsset };
        error?: string;
      };
      if (!completeResponse.ok || !completePayload.data) {
        throw new Error(completePayload.error ?? "Could not process image.");
      }

      setMedia(completePayload.data.media);
      setFile(null);
      setStatus("Image is verified, optimized, and live.");
    } catch (caught) {
      setStatus(safeErrorMessage(caught, "Could not upload this image."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5">
      <h3 className="text-lg font-bold text-charcoal">{label}</h3>
      <p className="mt-1 text-sm text-charcoal/65">{guidance}</p>

      {media ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-cream">
          {/* The URL is an immutable verified public-media rendition. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.url} alt={media.alt ?? ""} className="h-48 w-full object-contain" />
        </div>
      ) : (
        <div className="mt-4 grid h-32 place-items-center rounded-lg border border-dashed border-black/20 bg-cream text-sm text-charcoal/55">
          No verified image yet
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <label htmlFor={inputId} className="grid gap-1 text-sm font-semibold text-charcoal">
          Image file
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="min-h-11 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-charcoal">
          Visual description
          <input
            value={altText}
            maxLength={240}
            disabled={busy}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Example: Dining room with the pickup counter in warm evening light"
            className="min-h-11 rounded-lg border border-black/15 px-3 text-sm font-normal"
          />
        </label>
        <button
          type="button"
          onClick={upload}
          disabled={busy || !file}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest px-4 font-semibold text-white disabled:opacity-50"
        >
          {busy ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : <ImageUp size={18} aria-hidden="true" />}
          {busy ? "Processing..." : media ? "Replace image" : "Upload image"}
        </button>
      </div>
      {status ? <p aria-live="polite" className="mt-3 text-sm text-charcoal/75">{status}</p> : null}
    </section>
  );
}
