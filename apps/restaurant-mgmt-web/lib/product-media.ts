import { publicStorageUrl, STORAGE_BUCKETS } from "@gozaika/supabase";
import type { ProductMediaTargetCode, PublicMediaAsset } from "@gozaika/types";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

export const PRODUCT_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const PRODUCT_MEDIA_MAX_PIXELS = 40_000_000;
export const PRODUCT_MEDIA_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ProductMediaTargetConfig = {
  readonly width: number;
  readonly height: number;
  readonly fit: "cover" | "contain";
  readonly minimumSide: number;
  readonly pathSegment: string;
};

export const PRODUCT_MEDIA_TARGETS: Record<ProductMediaTargetCode, ProductMediaTargetConfig> = {
  RESTAURANT_HERO: { width: 1600, height: 900, fit: "cover", minimumSide: 800, pathSegment: "profile/hero" },
  RESTAURANT_LOGO: { width: 512, height: 512, fit: "contain", minimumSide: 128, pathSegment: "profile/logo" },
  DROP_PRIMARY: { width: 1200, height: 900, fit: "cover", minimumSide: 600, pathSegment: "drops/primary" },
};

const MIME_BY_FORMAT = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export function safeUploadExtension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  throw new Error("UNSUPPORTED_MEDIA_TYPE");
}

export function createMediaIngestPath(restaurantPk: string, mimeType: string): string {
  return `restaurants/${restaurantPk}/pending/${randomUUID()}.${safeUploadExtension(mimeType)}`;
}

export function createPublicMediaPath(
  restaurantPk: string,
  targetCode: ProductMediaTargetCode,
  dropPk?: string | null,
): string {
  const target = PRODUCT_MEDIA_TARGETS[targetCode];
  if (targetCode === "DROP_PRIMARY") {
    if (!dropPk) throw new Error("DROP_TARGET_REQUIRED");
    return `restaurants/${restaurantPk}/drops/${dropPk}/primary/${randomUUID()}.webp`;
  }
  return `restaurants/${restaurantPk}/${target.pathSegment}/${randomUUID()}.webp`;
}

export type RenderedProductMedia = {
  readonly bytes: Buffer;
  readonly width: number;
  readonly height: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly sourceMimeType: (typeof PRODUCT_MEDIA_ALLOWED_MIME_TYPES)[number];
  readonly sha256: string;
};

export async function verifyAndRenderProductMedia(
  source: ArrayBuffer | Buffer,
  targetCode: ProductMediaTargetCode,
): Promise<RenderedProductMedia> {
  const input = Buffer.isBuffer(source) ? source : Buffer.from(source);
  if (input.byteLength < 1 || input.byteLength > PRODUCT_MEDIA_MAX_BYTES) {
    throw new Error("INVALID_MEDIA_SIZE");
  }

  const pipeline = sharp(input, {
    animated: false,
    failOn: "error",
    limitInputPixels: PRODUCT_MEDIA_MAX_PIXELS,
    sequentialRead: true,
  });
  const metadata = await pipeline.metadata();
  const sourceMimeType = metadata.format ? MIME_BY_FORMAT[metadata.format as keyof typeof MIME_BY_FORMAT] : undefined;
  if (!sourceMimeType || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) {
    throw new Error("UNSUPPORTED_OR_INVALID_IMAGE");
  }
  if (metadata.width > 12_000 || metadata.height > 12_000 || metadata.width * metadata.height > PRODUCT_MEDIA_MAX_PIXELS) {
    throw new Error("IMAGE_DIMENSIONS_TOO_LARGE");
  }

  const target = PRODUCT_MEDIA_TARGETS[targetCode];
  if (Math.min(metadata.width, metadata.height) < target.minimumSide) {
    throw new Error("IMAGE_DIMENSIONS_TOO_SMALL");
  }

  const resize =
    target.fit === "cover"
      ? { width: target.width, height: target.height, fit: "cover" as const, position: "attention" as const }
      : {
          width: target.width,
          height: target.height,
          fit: "contain" as const,
          position: "centre" as const,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        };

  const bytes = await pipeline
    .rotate()
    .resize(resize)
    .webp({ quality: 86, alphaQuality: 90, effort: 5, smartSubsample: true })
    .toBuffer();
  const output = await sharp(bytes).metadata();
  if (!output.width || !output.height) throw new Error("RENDITION_FAILED");

  return {
    bytes,
    width: output.width,
    height: output.height,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    sourceMimeType,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function toPublicMediaAsset(input: {
  readonly bucketName: string | null | undefined;
  readonly objectPath: string | null | undefined;
  readonly width: number | null | undefined;
  readonly height: number | null | undefined;
  readonly altText: string | null | undefined;
}): PublicMediaAsset | null {
  if (!input.bucketName || !input.objectPath || input.bucketName !== STORAGE_BUCKETS.publicMedia) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return {
    url: publicStorageUrl(supabaseUrl, input.bucketName, input.objectPath),
    width: input.width ?? null,
    height: input.height ?? null,
    alt: input.altText ?? null,
    blurhash: null,
  };
}

export function sanitizeOriginalFilename(fileName: string): string {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180) || "upload";
}
