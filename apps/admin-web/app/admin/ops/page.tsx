import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";
import { AdminNavHeader } from "../admin-nav";
import {
  mapOpsAudit,
  mapOpsConfig,
  mapOpsDrop,
  mapOpsIncident,
  mapOpsRefund,
  mapOpsRestaurant,
  mapOpsSupport,
  type AdminOpsAuditDbRow,
  type AdminOpsConfigRow,
  type AdminOpsDropRow,
  type AdminOpsIncidentRow,
  type AdminOpsRefundRow,
  type AdminOpsRestaurantRow,
  type AdminOpsSupportRow,
} from "@/lib/ops";
import { AdminOpsClient } from "./ops-client";

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const service = createServiceRoleSupabaseClient();
  const [
    restaurants,
    drops,
    incidents,
    supportTickets,
    refunds,
    configFlags,
    auditRows,
  ] = await Promise.all([
    service.from("api_admin_ops_restaurant_summary").select("*").order("updated_at", { ascending: false }).limit(120),
    service.from("api_admin_ops_drop_summary").select("*").order("pickup_start_at", { ascending: false }).limit(120),
    service.from("api_admin_ops_incident_queue").select("*").order("updated_at", { ascending: false }).limit(120),
    service.from("api_admin_ops_support_queue").select("*").order("updated_at", { ascending: false }).limit(120),
    service.from("api_admin_ops_refund_queue").select("*").order("updated_at", { ascending: false }).limit(120),
    service.from("api_admin_ops_config_flag").select("*").order("updated_at", { ascending: false }).limit(120),
    service.from("api_admin_ops_audit_log").select("*").order("created_at", { ascending: false }).limit(80),
  ]);

  const loadError = [restaurants, drops, incidents, supportTickets, refunds, configFlags, auditRows]
    .find((result) => result.error)?.error;

  return (
    <main id="main-content">
      <AdminNavHeader />
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Admin Ops Hardening</p>
            <h1 className="mt-2 text-3xl font-bold">Restaurant trust control center</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Pause risky restaurants or drops, triage incidents/support/refund tracking, review allowlisted launch flags, and copy bounded support-safe queue details.
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-[#1A5C38]/25 px-4 py-3 text-sm font-semibold text-[#1A5C38]" href="/admin">
            Admin home
          </Link>
        </div>
        <div className="mt-5">
          {loadError ? (
            <div className="rounded-lg border border-[#B42318]/25 bg-[#FFF4F2] p-4 text-sm text-[#7A271A]">
              <h2 className="text-base font-bold">Ops read models unavailable</h2>
              <p className="mt-2">
                Apply the Slice 8B Supabase migration before using the admin ops queue. Existing admin
                surfaces remain available while this guarded setup state is visible.
              </p>
            </div>
          ) : (
            <AdminOpsClient
              actorRoleCodes={actor.roleCodes}
              restaurants={((restaurants.data ?? []) as AdminOpsRestaurantRow[]).map(mapOpsRestaurant)}
              drops={((drops.data ?? []) as AdminOpsDropRow[]).map(mapOpsDrop)}
              incidents={((incidents.data ?? []) as AdminOpsIncidentRow[]).map(mapOpsIncident)}
              supportTickets={((supportTickets.data ?? []) as AdminOpsSupportRow[]).map(mapOpsSupport)}
              refunds={((refunds.data ?? []) as AdminOpsRefundRow[]).map(mapOpsRefund)}
              configFlags={((configFlags.data ?? []) as AdminOpsConfigRow[]).map(mapOpsConfig)}
              auditRows={((auditRows.data ?? []) as AdminOpsAuditDbRow[]).map(mapOpsAudit)}
            />
          )}
        </div>
      </section>
    </main>
  );
}
