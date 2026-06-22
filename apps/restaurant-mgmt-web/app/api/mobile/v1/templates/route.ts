import type { TemplatesData } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadPortalTemplates } from "@/lib/slice3";

/**
 * BAM Bag templates for the selected restaurant (Slice 13). Role-gated by
 * `manageTemplates` (OWNER/ADMIN/OPS). Reuses the canonical `loadPortalTemplates`
 * loader; trimmed to the fields the drop publisher needs.
 */
export const GET = withMobileRestaurantRole("manageTemplates", async ({ restaurantPk, requestId }) => {
  try {
    const templates = await loadPortalTemplates(restaurantPk);
    const data: TemplatesData = {
      templates: templates.map((t) => ({
        templatePk: t.templatePk,
        templateName: t.templateName,
        templateStatusCode: t.templateStatusCode,
        activeRevisionPk: t.activeRevisionPk,
        displayName: t.displayName,
        shortDescription: t.shortDescription,
        dietaryCategoryCode: t.dietaryCategoryCode,
        spiceLevelCode: t.spiceLevelCode,
        allergenSummaryText: t.allergenSummaryText,
        defaultDropQuantity: t.defaultDropQuantity,
        defaultPickupStartOffsetMinutes: t.defaultPickupStartOffsetMinutes,
        defaultPickupDurationMinutes: t.defaultPickupDurationMinutes,
        suggestedPricePaise: t.suggestedPricePaise,
      })),
    };
    return mobileResponseOk(data, requestId);
  } catch (caught) {
    console.error("mobile_templates_load_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Could not load templates.", requestId);
  }
});
