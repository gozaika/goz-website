import { z } from "zod";

/**
 * Customer account contracts (Slice 11): the Zayka Passport (tier card, collected
 * bags, badges) and the Flavour-Diversity discovery profile. The precise TS DTOs
 * (`ZaykaPassportPayload`, `DiscoveryProfile`, …) already live in the package root
 * and are the single shared type; these are the permissive **wire** Zod schemas the
 * BFF validates against and the mobile client decodes. Code fields stay `z.string()`
 * so an unknown future tier/badge code is normalized, not hard-failed.
 */

export const passportBadgeWireSchema = z.object({
  badgeCode: z.string(),
  badgeName: z.string(),
  description: z.string(),
  earned: z.boolean(),
  hintText: z.string(),
});

export const zaykaPassportStatWireSchema = z.object({
  consumerProfilePk: z.string(),
  totalBagsCollected: z.number(),
  totalRestaurantsVisited: z.number(),
  totalNeighborhoodsVisited: z.number(),
  currentTierCode: z.string(),
  reviewCount: z.number(),
});

export const zaykaPassportPayloadSchema = z.object({
  stat: zaykaPassportStatWireSchema,
  badges: z.array(passportBadgeWireSchema),
  bagsToNextTier: z.number().nullable(),
  progressPercent: z.number(),
  nextTierCode: z.string().nullable(),
});

export const cuisineStatWireSchema = z.object({
  cuisineCode: z.string(),
  cuisineName: z.string(),
  bagCount: z.number(),
});

export const untriedCuisineWireSchema = z.object({
  cuisineCode: z.string(),
  cuisineName: z.string(),
  activeDropCount: z.number(),
});

export const neighbourhoodStatWireSchema = z.object({
  neighbourhoodCode: z.string(),
  neighbourhoodName: z.string(),
  bagCount: z.number(),
});

export const discoveryProfileSchema = z.object({
  triedCuisines: z.array(cuisineStatWireSchema),
  untriedCuisines: z.array(untriedCuisineWireSchema),
  totalAvailableCuisines: z.number(),
  triedNeighbourhoods: z.array(neighbourhoodStatWireSchema),
  totalActiveNeighbourhoods: z.number(),
  flavourDiversityScore: z.number(),
  flavourPersonalityLabel: z.string(),
});
