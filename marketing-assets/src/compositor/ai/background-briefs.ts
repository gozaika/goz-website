import type { StaticCardInput } from "../templates/static-card";
import { protectedScreenRegion } from "../templates/static-card";

export type AiBackgroundBrief = {
  readonly assetId: string;
  readonly allowedUse: "background-only";
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly protectedRegions: readonly ReturnType<typeof protectedScreenRegion>[];
  readonly sourceSha256: string;
};

export function buildAiBackgroundBrief(input: StaticCardInput): AiBackgroundBrief {
  const surfaceCue = input.surface === "restaurant" ? "premium restaurant operations" : "premium Hyderabad pickup discovery";
  return {
    assetId: input.assetId,
    allowedUse: "background-only",
    prompt:
      `Create a refined ${surfaceCue} atmospheric background with warm studio lighting, subtle depth, natural materials, and quiet premium energy. ` +
      "Leave the protected phone UI region untouched and empty of generated text.",
    negativePrompt:
      "No generated UI, no fake app screens, no logos, no readable text, no QR codes, no OTP, no prices, no restaurant names, no ratings, no sale stickers, no discount cues, no clutter, no plastic, no malformed hands.",
    protectedRegions: [protectedScreenRegion(input)],
    sourceSha256: input.sourceSha256,
  };
}
