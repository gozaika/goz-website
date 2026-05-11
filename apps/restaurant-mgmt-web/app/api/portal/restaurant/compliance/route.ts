import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { restaurantComplianceUpdateSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { assertRestaurantAccess, getPortalActor } from "@/lib/portal-auth";

export async function PATCH(request: Request) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = restaurantComplianceUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check compliance fields and try again." }, { status: 400 });
  }

  const allowed = await assertRestaurantAccess(parsed.data.restaurantPk, actor.profilePk);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "You do not have access to this restaurant." }, { status: 403 });
  }

  const service = createServiceRoleSupabaseClient();
  const { error } = await service
    .from("restaurant_compliance")
    .upsert(
      {
        restaurant_fk: parsed.data.restaurantPk,
        fssai_license_number: parsed.data.fssaiLicenseNumber,
        fssai_license_expiry_date: parsed.data.fssaiLicenseExpiryDate,
        gstin: parsed.data.gstin,
        pan_number: parsed.data.panNumber,
        compliance_status_code: "UNDER_REVIEW",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_fk" },
    );

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not save compliance details." }, { status: 500 });
  }

  if (parsed.data.accountHolderName && parsed.data.bankName && parsed.data.maskedAccountNumber && parsed.data.ifscCode) {
    await service
      .from("restaurant_payout_account")
      .upsert(
        {
          restaurant_fk: parsed.data.restaurantPk,
          account_holder_name: parsed.data.accountHolderName,
          bank_name: parsed.data.bankName,
          masked_account_number: parsed.data.maskedAccountNumber,
          ifsc_code: parsed.data.ifscCode,
          payout_account_status_code: "PENDING",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_fk" },
      );
  }

  await service
    .from("restaurant_onboarding_task")
    .update({
      task_status_code: "COMPLETED",
      completed_at: new Date().toISOString(),
      completed_by_profile_fk: actor.profilePk,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_fk", parsed.data.restaurantPk)
    .eq("task_code", "COMPLIANCE_DETAILS");

  return NextResponse.json({ ok: true });
}
