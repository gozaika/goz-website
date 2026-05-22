import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { PublicDropCard } from "@gozaika/types";
import { LaunchCommsPanel, ShellHeader } from "@gozaika/ui";
import { createPublicDropUrl, formatPaise, formatPickupWindow, generateManualDropAlertText } from "@gozaika/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type PublicDropRow = {
  readonly drop_drop_pk: string;
  readonly drop_title: string;
  readonly drop_status_code: PublicDropCard["statusCode"];
  readonly drop_type_code: string;
  readonly quantity_total: number;
  readonly computed_quantity_available: number;
  readonly price_paise: number | string;
  readonly pickup_start_at: string;
  readonly pickup_end_at: string;
  readonly restaurant_slug: string;
  readonly restaurant_name: string;
  readonly neighborhood_name: string | null;
  readonly bag_display_name: string;
  readonly bag_short_description: string | null;
  readonly dietary_category_code: PublicDropCard["dietaryCategoryCode"];
  readonly spice_level_code: PublicDropCard["spiceLevelCode"];
  readonly serves_min: number | string | null;
  readonly serves_max: number | string | null;
  readonly max_holding_minutes: number | string | null;
  readonly holding_guidance_text: string | null;
  readonly min_menu_value_paise: number | string | null;
  readonly allergen_summary_text: string | null;
  readonly allergen_codes: readonly string[] | null;
};

type HoldSummaryRow = {
  readonly hold_pk: string;
  readonly drop_pk: string;
  readonly consumer_profile_pk: string;
  readonly hold_status_code: string;
  readonly quantity_held: number | string;
  readonly expires_at: string;
  readonly hold_created_at: string;
  readonly drop_title: string;
  readonly restaurant_name: string;
  readonly bag_display_name: string;
  readonly price_paise: number | string;
  readonly pickup_start_at: string;
  readonly pickup_end_at: string;
};

type HoldRow = {
  readonly drop_inventory_hold_pk: string;
  readonly drop_fk: string;
  readonly consumer_profile_fk: string;
  readonly hold_status_code: string;
  readonly quantity: number | string;
  readonly expires_at: string;
  readonly created_at: string;
};

type PaymentIntentRow = {
  readonly payment_order_intent_pk: string;
  readonly drop_inventory_hold_fk: string;
  readonly order_fk: string | null;
  readonly provider_order_ref: string | null;
  readonly payment_intent_status_code: string;
  readonly amount_paise: number | string;
  readonly currency_code: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly drop_inventory_hold:
    | { readonly hold_status_code: string; readonly expires_at: string }
    | { readonly hold_status_code: string; readonly expires_at: string }[]
    | null;
  readonly order_order:
    | { readonly order_number: string; readonly order_status_code: string; readonly payment_status_code: string; readonly snapshot_restaurant_name: string; readonly snapshot_drop_title: string }
    | { readonly order_number: string; readonly order_status_code: string; readonly payment_status_code: string; readonly snapshot_restaurant_name: string; readonly snapshot_drop_title: string }[]
    | null;
};

type WebhookRow = {
  readonly payment_webhook_event_pk: string;
  readonly provider_event_id: string;
  readonly event_type_code: string;
  readonly signature_verified_flag: boolean;
  readonly processing_status_code: string;
  readonly processed_at: string | null;
  readonly processing_error_text: string | null;
  readonly received_at: string;
};

function mapPublicDrop(row: PublicDropRow): PublicDropCard {
  return {
    dropPk: row.drop_drop_pk,
    dropTitle: row.drop_title,
    dropTypeCode: row.drop_type_code,
    restaurantName: row.restaurant_name,
    restaurantSlug: row.restaurant_slug,
    neighborhoodName: row.neighborhood_name,
    bagDisplayName: row.bag_display_name,
    bagShortDescription: row.bag_short_description,
    dietaryCategoryCode: row.dietary_category_code,
    spiceLevelCode: row.spice_level_code,
    servesMin: row.serves_min == null ? null : Number(row.serves_min),
    servesMax: row.serves_max == null ? null : Number(row.serves_max),
    maxHoldingMinutes: row.max_holding_minutes == null ? null : Number(row.max_holding_minutes),
    holdingGuidanceText: row.holding_guidance_text,
    minMenuValuePaise: row.min_menu_value_paise == null ? null : Number(row.min_menu_value_paise),
    allergenSummaryText: row.allergen_summary_text,
    allergenCodes: row.allergen_codes ?? [],
    pricePaise: Number(row.price_paise),
    pickupStartAt: row.pickup_start_at,
    pickupEndAt: row.pickup_end_at,
    quantityTotal: row.quantity_total,
    quantityAvailable: row.computed_quantity_available,
    statusCode: row.drop_status_code,
  };
}

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function AdminDropsPage() {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const service = createServiceRoleSupabaseClient();
  const [
    { data, error },
    { data: holdsData, error: holdsError },
    { data: paymentData, error: paymentError },
    { data: webhookData, error: webhookError },
  ] = await Promise.all([
    service
    .from("api_public_drop_card")
    .select("*")
    .in("drop_status_code", ["ACTIVE", "SCHEDULED"])
      .order("pickup_start_at", { ascending: true }),
    service
      .from("drop_inventory_hold")
      .select("drop_inventory_hold_pk,drop_fk,consumer_profile_fk,hold_status_code,quantity,expires_at,created_at")
      .in("hold_status_code", ["ACTIVE", "EXPIRED", "RELEASED"])
      .order("created_at", { ascending: false })
      .limit(25),
    service
      .from("payment_order_intent")
      .select("payment_order_intent_pk,drop_inventory_hold_fk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code,created_at,updated_at,drop_inventory_hold(hold_status_code,expires_at),order_order(order_number,order_status_code,payment_status_code,snapshot_restaurant_name,snapshot_drop_title)")
      .order("created_at", { ascending: false })
      .limit(25),
    service
      .from("payment_webhook_event")
      .select("payment_webhook_event_pk,provider_event_id,event_type_code,signature_verified_flag,processing_status_code,processed_at,processing_error_text,received_at")
      .order("received_at", { ascending: false })
      .limit(25),
  ]);

  if (error) {
    throw new Error("Could not load public drops for launch comms.");
  }
  if (holdsError) {
    throw new Error("Could not load hold support summary.");
  }
  if (paymentError) {
    throw new Error("Could not load payment support summary.");
  }
  if (webhookError) {
    throw new Error("Could not load webhook support summary.");
  }

  const drops = ((data ?? []) as PublicDropRow[]).map(mapPublicDrop);
  const dropsByPk = new Map(drops.map((drop) => [drop.dropPk, drop]));
  const holdRows = (holdsData ?? []) as HoldRow[];
  const missingHoldDropPks = [...new Set(holdRows.map((hold) => hold.drop_fk).filter((dropPk) => !dropsByPk.has(dropPk)))];
  if (missingHoldDropPks.length) {
    const { data: holdDropData } = await service
      .from("api_public_drop_card")
      .select("*")
      .in("drop_drop_pk", missingHoldDropPks);
    for (const drop of ((holdDropData ?? []) as PublicDropRow[]).map(mapPublicDrop)) {
      dropsByPk.set(drop.dropPk, drop);
    }
  }
  const holds: HoldSummaryRow[] = holdRows.flatMap((hold) => {
    const drop = dropsByPk.get(hold.drop_fk);
    if (!drop) return [];
    return [
      {
        hold_pk: hold.drop_inventory_hold_pk,
        drop_pk: hold.drop_fk,
        consumer_profile_pk: hold.consumer_profile_fk,
        hold_status_code: hold.hold_status_code,
        quantity_held: hold.quantity,
        expires_at: hold.expires_at,
        hold_created_at: hold.created_at,
        drop_title: drop.dropTitle,
        restaurant_name: drop.restaurantName,
        bag_display_name: drop.bagDisplayName,
        price_paise: drop.pricePaise,
        pickup_start_at: drop.pickupStartAt,
        pickup_end_at: drop.pickupEndAt,
      },
    ];
  });
  const payments = (paymentData ?? []) as PaymentIntentRow[];
  const webhooks = (webhookData ?? []) as WebhookRow[];

  return (
    <main>
      <ShellHeader>
        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="text-[#1A5C38]" href="/admin/restaurants/onboarding">
            Onboarding
          </Link>
          <Link className="text-[#1A5C38]" href="/admin/drops">
            Drops
          </Link>
        </nav>
      </ShellHeader>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Launch ops</p>
            <h1 className="mt-2 text-3xl font-bold">Manual drop comms</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Copy the public consumer link and the same WhatsApp-safe alert text restaurants see for active or scheduled public drops.
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-[#1A5C38]/25 px-4 py-3 text-sm font-semibold text-[#1A5C38]" href="/admin">
            Admin home
          </Link>
        </div>

        <div className="mt-6 grid gap-4">
          {drops.length === 0 ? (
            <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
              No active or scheduled public drops are ready for manual launch comms.
            </section>
          ) : (
            drops.map((drop) => {
              const publicUrl = createPublicDropUrl(drop.dropPk);
              const alertText = generateManualDropAlertText(drop, publicUrl);
              return (
                <article key={drop.dropPk} className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <p className="text-sm font-semibold text-[#1A5C38]">{drop.restaurantName}</p>
                    <h2 className="mt-1 text-xl font-bold">{drop.dropTitle || drop.bagDisplayName}</h2>
                    <dl className="mt-4 grid gap-2 text-sm text-black/70 sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-black">Pickup</dt>
                        <dd>{formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-black">Price</dt>
                        <dd>{formatPaise(drop.pricePaise)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-black">Quantity</dt>
                        <dd>
                          {drop.quantityAvailable} / {drop.quantityTotal} available
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-black">Status</dt>
                        <dd>{drop.statusCode}</dd>
                      </div>
                    </dl>
                  </div>
                  <LaunchCommsPanel publicUrl={publicUrl} alertText={alertText} title="Copy for WhatsApp" />
                </article>
              );
            })
          )}
        </div>

        <section className="mt-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Claim holds</p>
            <h2 className="mt-2 text-2xl font-bold">Active and recent hold intents</h2>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              These rows explain why inventory is reserved. They are temporary holds only and expire back into drop availability.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {holds.length === 0 ? (
              <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
                No active or recent claim holds are visible yet.
              </section>
            ) : (
              holds.map((hold) => (
                <article key={hold.hold_pk} className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1A5C38]">{hold.restaurant_name}</p>
                      <h3 className="mt-1 font-bold">{hold.drop_title || hold.bag_display_name}</h3>
                      <p className="mt-1 text-xs text-black/55">
                        Hold {hold.hold_pk.slice(0, 8)} - consumer {hold.consumer_profile_pk.slice(0, 8)}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#1A5C38]/25 px-3 py-1 text-xs font-semibold text-[#1A5C38]">
                      {hold.hold_status_code}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-black/70 sm:grid-cols-4">
                    <div>
                      <dt className="font-semibold text-black">Quantity</dt>
                      <dd>{Number(hold.quantity_held)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-black">Price</dt>
                      <dd>{formatPaise(Number(hold.price_paise))}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-black">Pickup</dt>
                      <dd>{formatPickupWindow(hold.pickup_start_at, hold.pickup_end_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-black">Expires</dt>
                      <dd>{new Date(hold.expires_at).toLocaleString("en-IN")}</dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="mt-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Payments</p>
            <h2 className="mt-2 text-2xl font-bold">Recent payment and order state</h2>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Support-safe status for answering whether a hold has a Razorpay order, captured payment, or confirmed order.
              Raw provider payloads and pickup credential hashes are not shown.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {payments.length === 0 ? (
              <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
                No payment intents are visible yet.
              </section>
            ) : (
              payments.map((payment) => {
                const order = singleRelation(payment.order_order);
                const hold = singleRelation(payment.drop_inventory_hold);
                return (
                  <article key={payment.payment_order_intent_pk} className="rounded-lg border border-black/10 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1A5C38]">
                            {order?.order_number ?? payment.provider_order_ref ?? payment.payment_order_intent_pk.slice(0, 8)}
                          </p>
                          <h3 className="mt-1 font-bold">
                            {order?.snapshot_restaurant_name ?? "Payment intent pending order"}
                          </h3>
                          <p className="mt-1 text-xs text-black/55">
                            Hold {payment.drop_inventory_hold_fk.slice(0, 8)} - intent {payment.payment_order_intent_pk.slice(0, 8)}
                          </p>
                        </div>
                        <span className="rounded-full border border-[#1A5C38]/25 px-3 py-1 text-xs font-semibold text-[#1A5C38]">
                          {payment.payment_intent_status_code}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-2 text-sm text-black/70 sm:grid-cols-5">
                        <div>
                          <dt className="font-semibold text-black">Amount</dt>
                          <dd>{formatPaise(Number(payment.amount_paise))}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-black">Hold</dt>
                          <dd>{hold?.hold_status_code ?? "Unknown"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-black">Order</dt>
                          <dd>{order?.order_status_code ?? "Not created"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-black">Provider order</dt>
                          <dd>{payment.provider_order_ref ? payment.provider_order_ref.slice(0, 18) : "Not created"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-black">Updated</dt>
                          <dd>{new Date(payment.updated_at).toLocaleString("en-IN")}</dd>
                        </div>
                      </dl>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="mt-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Webhook ledger</p>
            <h2 className="mt-2 text-2xl font-bold">Recent Razorpay webhooks</h2>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Signature and processing status only. Provider payloads stay service-role only.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {webhooks.length === 0 ? (
              <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
                No Razorpay webhook events are visible yet.
              </section>
            ) : (
              webhooks.map((webhook) => (
                <article key={webhook.payment_webhook_event_pk} className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1A5C38]">{webhook.event_type_code}</p>
                      <h3 className="mt-1 font-bold">{webhook.provider_event_id}</h3>
                    </div>
                    <span className="rounded-full border border-[#1A5C38]/25 px-3 py-1 text-xs font-semibold text-[#1A5C38]">
                      {webhook.processing_status_code}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-black/70 sm:grid-cols-4">
                    <div>
                      <dt className="font-semibold text-black">Signature</dt>
                      <dd>{webhook.signature_verified_flag ? "Verified" : "Not verified"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-black">Received</dt>
                      <dd>{new Date(webhook.received_at).toLocaleString("en-IN")}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-black">Processed</dt>
                      <dd>{webhook.processed_at ? new Date(webhook.processed_at).toLocaleString("en-IN") : "Pending"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-black">Error</dt>
                      <dd>{webhook.processing_error_text ? webhook.processing_error_text.slice(0, 80) : "None"}</dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
