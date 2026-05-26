import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { ShellHeader } from "@gozaika/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";
import { mapFinanceSettlementDetail, mapFinanceSettlementSummary, type AdminRestaurantOption } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { AdminFinanceClient } from "./finance-client";

export const dynamic = "force-dynamic";

const statusFilters = ["ALL", "DRAFT", "LOCKED", "SENT", "PAID", "RECONCILED", "CANCELLED"] as const;

export default async function AdminFinancePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly status?: string; readonly settlement?: string }>;
}) {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const params = await searchParams;
  const status = statusFilters.includes((params.status ?? "ALL").toUpperCase() as (typeof statusFilters)[number])
    ? (params.status ?? "ALL").toUpperCase()
    : "ALL";

  const service = createServiceRoleSupabaseClient();
  const { data: restaurantData, error: restaurantError } = await service
    .from("restaurant_restaurant")
    .select("restaurant_restaurant_pk,restaurant_name,restaurant_status_code")
    .order("restaurant_name", { ascending: true })
    .limit(200);

  if (restaurantError) {
    throw new Error("Could not load restaurants for finance.");
  }

  const restaurants: AdminRestaurantOption[] = (restaurantData ?? []).map((restaurant) => ({
    restaurantPk: restaurant.restaurant_restaurant_pk,
    restaurantName: restaurant.restaurant_name,
    statusCode: restaurant.restaurant_status_code,
  }));

  const supabase = await createClient();
  let settlementQuery = supabase
    .from("api_admin_finance_settlement_summary")
    .select("*")
    .order("period_end_at", { ascending: false })
    .limit(80);
  if (status !== "ALL") settlementQuery = settlementQuery.eq("settlement_status_code", status);

  const { data: settlementData, error: settlementError } = await settlementQuery;
  if (settlementError) {
    throw new Error("Could not load finance settlements.");
  }

  const settlements = (settlementData ?? []).map(mapFinanceSettlementSummary);
  const selectedSettlement = settlements.find((settlement) => settlement.settlementRunPk === params.settlement) ?? settlements[0] ?? null;

  const { data: detailData, error: detailError } = selectedSettlement
    ? await supabase
        .from("api_admin_finance_settlement_detail")
        .select("*")
        .eq("settlement_run_pk", selectedSettlement.settlementRunPk)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (detailError) {
    throw new Error("Could not load settlement detail.");
  }

  const details = (detailData ?? []).map(mapFinanceSettlementDetail);

  return (
    <main>
      <ShellHeader>
        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="text-[#1A5C38]" href="/admin/drops">Drops</Link>
          <Link className="text-[#1A5C38]" href="/admin/notifications">Notifications</Link>
          <Link className="text-[#1A5C38]" href="/admin/finance">Finance</Link>
          <Link className="text-[#1A5C38]" href="/admin/reports">Reports</Link>
        </nav>
      </ShellHeader>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Pilot finance</p>
            <h1 className="mt-2 text-3xl font-bold">Settlements and payouts</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Preview captured closed pickup orders, create draft settlements, lock reviewed runs, issue invoice metadata, and mark manual payout states. This surface never starts Razorpay transfers or refunds.
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-[#1A5C38]/25 px-4 py-3 text-sm font-semibold text-[#1A5C38]" href="/admin">
            Admin home
          </Link>
        </div>
        <div className="mt-6">
          <AdminFinanceClient restaurants={restaurants} settlements={settlements} selectedSettlement={selectedSettlement} details={details} />
        </div>
      </section>
    </main>
  );
}
