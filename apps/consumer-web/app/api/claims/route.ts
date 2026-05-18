import { claimRequestSchema, type ApiResponse, type ClaimCreationResult } from "@gozaika/types";
import { getDropClaimAvailability } from "@gozaika/utils";
import { NextResponse } from "next/server";
import { mapClaimIntent, type ClaimIntentRow } from "@/lib/claims";
import { loadPublicDrop } from "@/lib/drops";
import { createClient } from "@/lib/supabase/server";

function claimErrorStatus(reason: string) {
  if (reason === "Sold out") return 409;
  if (reason === "Pickup window closed") return 409;
  return 400;
}

function mapRpcError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("consumer profile")) {
    return { error: "Please sign in to continue.", status: 401 };
  }

  if (message.includes("insufficient")) {
    return { error: "This drop is sold out or no longer has enough bags available.", status: 409 };
  }

  if (message.includes("unavailable")) {
    return { error: "This drop is not available to claim right now.", status: 409 };
  }

  if (message.includes("quantity")) {
    return { error: "Choose a valid claim quantity.", status: 400 };
  }

  return { error: "We could not hold this BAM Bag. Please try again.", status: 500 };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
  }

  const parsed = claimRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the claim details and try again." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const requestData = parsed.data;
  const drop = await loadPublicDrop(requestData.dropPk);
  if (!drop) {
    return NextResponse.json(
      { ok: false, error: "This drop is unavailable or no longer public." } satisfies ApiResponse,
      { status: 404 },
    );
  }

  const availability = getDropClaimAvailability(drop);
  if (!availability.canClaim) {
    return NextResponse.json(
      { ok: false, error: availability.reason } satisfies ApiResponse,
      { status: claimErrorStatus(availability.reason) },
    );
  }

  if (drop.quantityAvailable < requestData.quantity) {
    return NextResponse.json(
      { ok: false, error: "This drop does not have enough bags available." } satisfies ApiResponse,
      { status: 409 },
    );
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

  if (!consumerProfile?.consumer_profile_pk) {
    return NextResponse.json(
      { ok: false, error: "We could not prepare your consumer profile yet." } satisfies ApiResponse,
      { status: 500 },
    );
  }

  const nowIso = new Date().toISOString();
  const { data: existingHold, error: existingHoldError } = await supabase
    .from("api_claim_hold_summary")
    .select("*")
    .eq("drop_pk", requestData.dropPk)
    .eq("consumer_profile_pk", consumerProfile.consumer_profile_pk)
    .eq("hold_status_code", "ACTIVE")
    .gt("expires_at", nowIso)
    .order("hold_created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingHoldError) {
    return NextResponse.json(
      { ok: false, error: "We could not check your current hold state." } satisfies ApiResponse,
      { status: 500 },
    );
  }

  if (existingHold) {
    const claimIntent = mapClaimIntent(existingHold as ClaimIntentRow);
    const response: ApiResponse<ClaimCreationResult> = {
      ok: true,
      data: {
        claimIntent,
        alreadyHeld: true,
        confirmationHref: `/checkout/${claimIntent.holdPk}`,
      },
    };
    return NextResponse.json(response);
  }

  const { data: holdPk, error: holdError } = await supabase.rpc("api_create_inventory_hold", {
    p_drop_pk: requestData.dropPk,
    p_idempotency_key: requestData.idempotencyKey,
    p_quantity: requestData.quantity,
    p_hold_minutes: 10,
  });

  if (holdError || typeof holdPk !== "string") {
    const mapped = mapRpcError(holdError?.message ?? "");
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const { data: createdHold, error: createdHoldError } = await supabase
    .from("api_claim_hold_summary")
    .select("*")
    .eq("hold_pk", holdPk)
    .maybeSingle();

  if (createdHoldError || !createdHold) {
    return NextResponse.json(
      { ok: false, error: "Hold was created, but the confirmation is not ready yet." } satisfies ApiResponse,
      { status: 500 },
    );
  }

  const claimIntent = mapClaimIntent(createdHold as ClaimIntentRow);
  const response: ApiResponse<ClaimCreationResult> = {
    ok: true,
    data: {
      claimIntent,
      alreadyHeld: false,
      confirmationHref: `/checkout/${claimIntent.holdPk}`,
    },
  };

  return NextResponse.json(response);
}
