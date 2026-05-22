import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { ShellHeader, AllergenChips, DietaryBadge } from "@gozaika/ui";
import { formatPaise, formatPickupWindow } from "@gozaika/utils";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant } from "@/lib/slice3";
import { PortalNav } from "../portal-nav";

type OrderRow = {
  readonly order_order_pk: string;
  readonly order_number: string;
  readonly order_status_code: string;
  readonly payment_status_code: string;
  readonly snapshot_drop_title: string;
  readonly snapshot_bag_display_name: string;
  readonly snapshot_dietary_category_code: string;
  readonly snapshot_spice_level_code: string | null;
  readonly snapshot_allergen_summary_text: string | null;
  readonly total_paise: number | string;
  readonly pickup_window_start_at: string;
  readonly pickup_window_end_at: string;
  readonly order_item: { readonly quantity: number | string }[] | null;
  readonly payment_order_intent: { readonly payment_intent_status_code: string }[] | null;
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") redirect("/portal/onboarding");

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service
    .from("order_order")
    .select(
      "order_order_pk,order_number,order_status_code,payment_status_code,snapshot_drop_title,snapshot_bag_display_name,snapshot_dietary_category_code,snapshot_spice_level_code,snapshot_allergen_summary_text,total_paise,pickup_window_start_at,pickup_window_end_at,order_item(quantity),payment_order_intent(payment_intent_status_code)",
    )
    .eq("restaurant_fk", restaurant.restaurantPk)
    .in("order_status_code", ["PAID", "CONFIRMED", "READY_FOR_PICKUP"])
    .order("pickup_window_start_at", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error("Could not load restaurant orders.");
  }

  const orders = (data ?? []) as OrderRow[];

  return (
    <main>
      <ShellHeader>
        <PortalNav />
      </ShellHeader>
      <section className="px-6 py-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Paid and confirmed BAM Bag orders for pickup. Pickup verification and collected/no-show actions are intentionally
          not part of this slice.
        </p>

        <div className="mt-6 grid gap-3">
          {orders.length === 0 ? (
            <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-slate-600">
              No paid pickup orders are ready yet.
            </section>
          ) : (
            orders.map((order) => {
              const quantity = Number(order.order_item?.[0]?.quantity ?? 1);
              const paymentIntent = order.payment_order_intent?.[0]?.payment_intent_status_code ?? "CAPTURED";
              const allergenCodes = order.snapshot_allergen_summary_text
                ? order.snapshot_allergen_summary_text
                    .split(/[,.]/)
                    .map((item) => item.trim().toUpperCase())
                    .filter((item) => item.length > 2)
                    .slice(0, 4)
                : [];
              return (
                <article key={order.order_order_pk} className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1A5C38]">{order.order_number}</p>
                      <h2 className="mt-1 text-xl font-bold">{order.snapshot_bag_display_name}</h2>
                      <p className="mt-1 text-sm text-slate-600">{order.snapshot_drop_title}</p>
                    </div>
                    <DietaryBadge code={order.snapshot_dietary_category_code} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-5">
                    <div>
                      <dt className="font-semibold text-slate-950">Pickup</dt>
                      <dd>{formatPickupWindow(order.pickup_window_start_at, order.pickup_window_end_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-950">Quantity</dt>
                      <dd>{quantity}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-950">Paid</dt>
                      <dd>{formatPaise(Number(order.total_paise))}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-950">Order</dt>
                      <dd>{order.order_status_code}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-950">Payment</dt>
                      <dd>{paymentIntent}</dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-950">Dietary and allergen context</p>
                    <div className="mt-2">
                      <AllergenChips codes={allergenCodes} />
                    </div>
                    {order.snapshot_allergen_summary_text ? (
                      <p className="mt-2 text-sm font-medium text-[#B42318]">{order.snapshot_allergen_summary_text}</p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No allergen summary was snapshotted for this order.</p>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
