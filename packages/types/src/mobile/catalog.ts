import { z } from "zod";
import type { DietaryCategoryCode, DropStatusCode, SpiceLevelCode } from "../index";

/**
 * Restaurant catalog contracts (Slice 13): BAM Bag templates + Limited Drops.
 * The mobile counter app lists active templates, lists the restaurant's drops, and
 * publishes a drop from a template revision. Template *creation* (allergen/disclosure
 * authoring) stays on the web portal for now. Permissive wire + precise DTO.
 */

// ---- Templates (picker for publishing a drop) ----

export const templateSummaryWireSchema = z.object({
  templatePk: z.string(),
  templateName: z.string(),
  templateStatusCode: z.string(),
  activeRevisionPk: z.string().nullable(),
  displayName: z.string().nullable(),
  shortDescription: z.string().nullable(),
  dietaryCategoryCode: z.string().nullable(),
  spiceLevelCode: z.string().nullable(),
  allergenSummaryText: z.string().nullable(),
  defaultDropQuantity: z.number(),
  defaultPickupStartOffsetMinutes: z.number(),
  defaultPickupDurationMinutes: z.number(),
  suggestedPricePaise: z.number().nullable(),
});

export const templatesDataSchema = z.object({ templates: z.array(templateSummaryWireSchema) });

export interface TemplateSummary {
  readonly templatePk: string;
  readonly templateName: string;
  readonly templateStatusCode: string;
  readonly activeRevisionPk: string | null;
  readonly displayName: string | null;
  readonly shortDescription: string | null;
  readonly dietaryCategoryCode: DietaryCategoryCode | null;
  readonly spiceLevelCode: SpiceLevelCode | null;
  readonly allergenSummaryText: string | null;
  readonly defaultDropQuantity: number;
  readonly defaultPickupStartOffsetMinutes: number;
  readonly defaultPickupDurationMinutes: number;
  readonly suggestedPricePaise: number | null;
}
export interface TemplatesData {
  readonly templates: readonly TemplateSummary[];
}

// ---- Drops (the restaurant's own list) ----

export const dropSummaryWireSchema = z.object({
  dropPk: z.string(),
  dropTitle: z.string(),
  statusCode: z.string(),
  quantityTotal: z.number(),
  quantityHeld: z.number(),
  quantityAvailable: z.number(),
  pricePaise: z.number(),
  pickupStartAt: z.string(),
  pickupEndAt: z.string(),
});

export const dropsDataSchema = z.object({ drops: z.array(dropSummaryWireSchema) });

export interface DropSummary {
  readonly dropPk: string;
  readonly dropTitle: string;
  readonly statusCode: DropStatusCode;
  readonly quantityTotal: number;
  readonly quantityHeld: number;
  readonly quantityAvailable: number;
  readonly pricePaise: number;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
}
export interface DropsData {
  readonly drops: readonly DropSummary[];
}

// ---- Publish a drop ----

export const publishDropResultSchema = z.object({
  dropPk: z.string(),
  statusCode: z.string(),
});

export interface PublishDropResult {
  readonly dropPk: string;
  readonly statusCode: DropStatusCode;
}

/** POST /drops body — mirrors the canonical createDropDraftSchema. */
export interface PublishDropRequest {
  readonly templateRevisionPk: string;
  readonly dropTitle?: string;
  readonly quantityTotal: number;
  readonly pricePaise: number;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  readonly dropTypeCode?: "STANDARD" | "SPOTLIGHT" | "CHEF_SPECIAL" | "BLIND_ADVENTURE";
  readonly statusCode?: "DRAFT" | "SCHEDULED" | "ACTIVE";
}
