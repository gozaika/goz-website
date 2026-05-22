import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import {
  razorpayCheckoutOrderRequestSchema,
  type ApiResponse,
  type RazorpayCheckoutPayload,
} from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type HoldRow = {
  readonly drop_inventory_hold_pk: string;
  readonly drop_fk: string;
  readonly consumer_profile_fk: string;
  readonly hold_status_code: string;
  readonly quantity: number | string;
  readonly expires_at: string;
};

type DropRow = {
  readonly drop_drop_pk: string;
  readonly drop_title: string;
  readonly price_paise: number | string;
  readonly pickup_end_at: string;
  readonly restaurant_restaurant: { readonly restaurant_name: string } | { readonly restaurant_name: string }[] | null;
  readonly catalog_bag_template_revision:
    | { readonly display_name: string; readonly dietary_category_code: string; readonly allergen_summary_text: string | null }
    | { readonly display_name: string; readonly dietary_category_code: string; readonly allergen_summary_text: string | null }[]
    | null;
};

type IntentRow = {
  readonly payment_order_intent_pk: string;
  readonly order_fk: string | null;
  readonly provider_order_ref: string | null;
  readonly payment_intent_status_code: string;
  readonly amount_paise: number | string;
  readonly currency_code: string;
};

const CHECKOUT_CURRENCY_CODE = "INR";

function razorpayKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "";
}

function razorpayCurrencyConfigError(keyId: string, currencyCode: string) {
  if (currencyCode === "INR" && /^rzp_(?:test|live)_us_/i.test(keyId)) {
    return "Razorpay checkout is configured with a US account key, but this checkout creates INR orders. Please configure an India Razorpay key.";
  }

  return null;
}

async function currentConsumerProfilePk() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, consumerProfilePk: null, displayName: null, email: null, phone: null };
  }

  await supabase.rpc("api_bootstrap_consumer_profile", {
    p_full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    p_phone_e164: user.phone ?? null,
    p_email_address: user.email ?? null,
    p_default_city_code: "HYD",
    p_preferred_language_code: "en",
  });

  const { data: iamProfile } = await supabase
    .from("iam_profile")
    .select("iam_profile_pk,display_name,email_address,phone_e164")
    .eq("auth_user_fk", user.id)
    .single();
  const { data: consumerProfile } = iamProfile
    ? await supabase
        .from("consumer_profile")
        .select("consumer_profile_pk")
        .eq("iam_profile_fk", iamProfile.iam_profile_pk)
        .single()
    : { data: null };

  return {
    user,
    consumerProfilePk: consumerProfile?.consumer_profile_pk ?? null,
    displayName: iamProfile?.display_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    email: iamProfile?.email_address ?? user.email ?? null,
    phone: iamProfile?.phone_e164 ?? user.phone ?? null,
  };
}

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function checkoutPayload(input: {
  readonly keyId: string;
  readonly intent: IntentRow;
  readonly hold: HoldRow;
  readonly restaurantName: string;
  readonly bagDisplayName: string;
  readonly description: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
}): ApiResponse<RazorpayCheckoutPayload> {
  return {
    ok: true,
    data: {
      keyId: input.keyId,
      providerOrderRef: input.intent.provider_order_ref ?? "",
      paymentOrderIntentPk: input.intent.payment_order_intent_pk,
      holdPk: input.hold.drop_inventory_hold_pk,
      amountPaise: Number(input.intent.amount_paise),
      currencyCode: CHECKOUT_CURRENCY_CODE,
      restaurantName: input.restaurantName,
      bagDisplayName: input.bagDisplayName,
      description: input.description,
      prefill: {
        name: input.displayName ?? undefined,
        email: input.email ?? undefined,
        contact: input.phone?.replace(/^\+91/, "") ?? undefined,
      },
      status: input.intent.payment_intent_status_code === "CAPTURED" ? "CAPTURED" : "RAZORPAY_ORDER_CREATED",
      orderHref: input.intent.order_fk ? `/orders/${input.intent.order_fk}` : undefined,
    },
  };
}

export async function POST(request: Request) {
  const parsed = razorpayCheckoutOrderRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the checkout details and try again." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const keyId = razorpayKeyId();
  if (!keyId) {
    return NextResponse.json(
      { ok: false, error: "Razorpay checkout is not configured yet." } satisfies ApiResponse,
      { status: 503 },
    );
  }
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Razorpay server credentials are not configured yet." } satisfies ApiResponse,
      { status: 503 },
    );
  }
  const currencyConfigError = razorpayCurrencyConfigError(keyId, CHECKOUT_CURRENCY_CODE);
  if (currencyConfigError) {
    return NextResponse.json({ ok: false, error: currencyConfigError } satisfies ApiResponse, { status: 503 });
  }

  const actor = await currentConsumerProfilePk();
  if (!actor.user || !actor.consumerProfilePk) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data: hold, error: holdError } = await service
    .from("drop_inventory_hold")
    .select("drop_inventory_hold_pk,drop_fk,consumer_profile_fk,hold_status_code,quantity,expires_at")
    .eq("drop_inventory_hold_pk", parsed.data.holdPk)
    .eq("consumer_profile_fk", actor.consumerProfilePk)
    .maybeSingle();

  if (holdError) {
    return NextResponse.json({ ok: false, error: "Could not load this hold." } satisfies ApiResponse, { status: 500 });
  }
  if (!hold) {
    return NextResponse.json({ ok: false, error: "Hold not found." } satisfies ApiResponse, { status: 404 });
  }

  const holdRow = hold as HoldRow;
  if (holdRow.hold_status_code === "CONVERTED") {
    const { data: order } = await service
      .from("order_order")
      .select("order_order_pk")
      .eq("drop_inventory_hold_fk", holdRow.drop_inventory_hold_pk)
      .maybeSingle();
    return NextResponse.json(
      {
        ok: false,
        error: "This hold is already converted to a paid order.",
        data: order?.order_order_pk ? { orderHref: `/orders/${order.order_order_pk}` } : undefined,
      } satisfies ApiResponse,
      { status: 409 },
    );
  }
  if (holdRow.hold_status_code !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, error: "This hold is no longer active. Please create a new hold." } satisfies ApiResponse,
      { status: 409 },
    );
  }
  if (Date.parse(holdRow.expires_at) <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: "This hold has expired. Please return to the drop and hold a bag again." } satisfies ApiResponse,
      { status: 409 },
    );
  }

  const { data: drop, error: dropError } = await service
    .from("drop_drop")
    .select(
      "drop_drop_pk,drop_title,price_paise,pickup_end_at,restaurant_restaurant(restaurant_name),catalog_bag_template_revision(display_name,dietary_category_code,allergen_summary_text)",
    )
    .eq("drop_drop_pk", holdRow.drop_fk)
    .maybeSingle();
  if (dropError || !drop) {
    return NextResponse.json({ ok: false, error: "Drop unavailable for payment." } satisfies ApiResponse, { status: 409 });
  }

  const dropRow = drop as DropRow;
  if (Date.parse(dropRow.pickup_end_at) <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: "The pickup window has closed for this drop." } satisfies ApiResponse,
      { status: 409 },
    );
  }

  const restaurant = singleRelation(dropRow.restaurant_restaurant);
  const revision = singleRelation(dropRow.catalog_bag_template_revision);
  const amountPaise = Number(dropRow.price_paise) * Number(holdRow.quantity);
  const restaurantName = restaurant?.restaurant_name ?? "goZaika partner";
  const bagDisplayName = revision?.display_name ?? dropRow.drop_title;
  const description = `${bagDisplayName} from ${restaurantName}`;
  const reusableStatuses = ["CREATED", "RAZORPAY_ORDER_CREATED", "AUTHORIZED"];
  const { data: existingIntent } = await service
    .from("payment_order_intent")
    .select("payment_order_intent_pk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code")
    .eq("drop_inventory_hold_fk", holdRow.drop_inventory_hold_pk)
    .eq("consumer_profile_fk", actor.consumerProfilePk)
    .eq("amount_paise", amountPaise)
    .in("payment_intent_status_code", [...reusableStatuses, "CAPTURED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingIntent?.provider_order_ref) {
    return NextResponse.json(
      checkoutPayload({
        keyId,
        intent: existingIntent as IntentRow,
        hold: holdRow,
        restaurantName,
        bagDisplayName,
        description,
        displayName: actor.displayName,
        email: actor.email,
        phone: actor.phone,
      }),
    );
  }

  const { data: createdIntent, error: intentError } = await service
    .from("payment_order_intent")
    .insert({
      drop_inventory_hold_fk: holdRow.drop_inventory_hold_pk,
      consumer_profile_fk: actor.consumerProfilePk,
      provider_code: "RAZORPAY",
      payment_intent_status_code: "CREATED",
      amount_paise: amountPaise,
      currency_code: CHECKOUT_CURRENCY_CODE,
      idempotency_key: parsed.data.idempotencyKey,
      expires_at: holdRow.expires_at,
    })
    .select("payment_order_intent_pk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code")
    .single();

  if (intentError || !createdIntent) {
    return NextResponse.json(
      { ok: false, error: "We could not prepare payment for this hold." } satisfies ApiResponse,
      { status: 500 },
    );
  }

  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: CHECKOUT_CURRENCY_CODE,
      receipt: `gz_${createdIntent.payment_order_intent_pk.replaceAll("-", "").slice(0, 32)}`,
      notes: {
        hold_pk: holdRow.drop_inventory_hold_pk,
        payment_order_intent_pk: createdIntent.payment_order_intent_pk,
      },
    }),
  });

  const razorpayOrder = (await razorpayResponse.json().catch(() => ({}))) as { readonly id?: string };
  if (!razorpayResponse.ok || !razorpayOrder.id) {
    await service
      .from("payment_order_intent")
      .update({ payment_intent_status_code: "FAILED", updated_at: new Date().toISOString() })
      .eq("payment_order_intent_pk", createdIntent.payment_order_intent_pk);
    return NextResponse.json(
      { ok: false, error: "Razorpay is unavailable right now. Please retry while your hold is active." } satisfies ApiResponse,
      { status: 503 },
    );
  }

  const { data: updatedIntent, error: updateError } = await service
    .from("payment_order_intent")
    .update({
      provider_order_ref: razorpayOrder.id,
      payment_intent_status_code: "RAZORPAY_ORDER_CREATED",
      updated_at: new Date().toISOString(),
    })
    .eq("payment_order_intent_pk", createdIntent.payment_order_intent_pk)
    .select("payment_order_intent_pk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code")
    .single();

  if (updateError || !updatedIntent) {
    return NextResponse.json(
      { ok: false, error: "Payment was prepared, but checkout is not ready yet. Please retry." } satisfies ApiResponse,
      { status: 500 },
    );
  }

  return NextResponse.json(
    checkoutPayload({
      keyId,
      intent: updatedIntent as IntentRow,
      hold: holdRow,
      restaurantName,
      bagDisplayName,
      description,
      displayName: actor.displayName,
      email: actor.email,
      phone: actor.phone,
    }),
  );
}
