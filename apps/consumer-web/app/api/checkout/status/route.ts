import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { uuidSchema, type ApiResponse, type CheckoutStatus } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type IntentRow = {
  readonly payment_intent_status_code: CheckoutStatus["paymentIntentStatusCode"];
  readonly order_fk: string | null;
};

async function currentConsumerProfilePk() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: iamProfile } = await supabase
    .from("iam_profile")
    .select("iam_profile_pk")
    .eq("auth_user_fk", user.id)
    .single();
  const { data: consumerProfile } = iamProfile
    ? await supabase
        .from("consumer_profile")
        .select("consumer_profile_pk")
        .eq("iam_profile_fk", iamProfile.iam_profile_pk)
        .single()
    : { data: null };

  return consumerProfile?.consumer_profile_pk ?? null;
}

export async function GET(request: Request) {
  const holdPk = new URL(request.url).searchParams.get("holdPk");
  const parsedHoldPk = uuidSchema.safeParse(holdPk);
  if (!parsedHoldPk.success) {
    return NextResponse.json({ ok: false, error: "Hold id is required." } satisfies ApiResponse, { status: 400 });
  }

  const consumerProfilePk = await currentConsumerProfilePk();
  if (!consumerProfilePk) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data: hold, error: holdError } = await service
    .from("drop_inventory_hold")
    .select("drop_inventory_hold_pk,hold_status_code,converted_order_fk")
    .eq("drop_inventory_hold_pk", parsedHoldPk.data)
    .eq("consumer_profile_fk", consumerProfilePk)
    .maybeSingle();

  if (holdError) {
    return NextResponse.json({ ok: false, error: "Could not load checkout status." } satisfies ApiResponse, { status: 500 });
  }
  if (!hold) {
    return NextResponse.json({ ok: false, error: "Hold not found." } satisfies ApiResponse, { status: 404 });
  }

  const { data: intent } = await service
    .from("payment_order_intent")
    .select("payment_intent_status_code,order_fk")
    .eq("drop_inventory_hold_fk", parsedHoldPk.data)
    .eq("consumer_profile_fk", consumerProfilePk)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const orderPk = hold.converted_order_fk ?? (intent as IntentRow | null)?.order_fk ?? null;
  const { data: order } = orderPk
    ? await service.from("order_order").select("order_status_code").eq("order_order_pk", orderPk).maybeSingle()
    : { data: null };

  const response: ApiResponse<CheckoutStatus> = {
    ok: true,
    data: {
      holdPk: parsedHoldPk.data,
      holdStatusCode: hold.hold_status_code,
      paymentIntentStatusCode: (intent as IntentRow | null)?.payment_intent_status_code ?? null,
      orderPk,
      orderStatusCode: order?.order_status_code ?? null,
      orderHref: orderPk ? `/orders/${orderPk}` : null,
    },
  };

  return NextResponse.json(response);
}
