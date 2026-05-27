import type { AdminNotificationDeliverySummary } from "@gozaika/types";
import Link from "next/link";
import { AdminNavHeader } from "../admin-nav";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

type AdminNotificationRow = {
  readonly notification_outbox_pk: string;
  readonly order_pk: string | null;
  readonly order_number: string | null;
  readonly restaurant_fk: string | null;
  readonly restaurant_name: string | null;
  readonly template_code: string;
  readonly audience_code: string;
  readonly channel_code: AdminNotificationDeliverySummary["channelCode"];
  readonly send_status_code: AdminNotificationDeliverySummary["sendStatusCode"];
  readonly provider_code: string | null;
  readonly delivery_reason_code: string | null;
  readonly business_context_type_code: string | null;
  readonly provider_message_ref: string | null;
  readonly destination_masked_text: string;
  readonly scheduled_at: string;
  readonly sent_at: string | null;
  readonly next_attempt_at: string | null;
  readonly retry_count: number | string;
  readonly max_attempts: number | string;
  readonly last_attempt_status_code: AdminNotificationDeliverySummary["lastAttemptStatusCode"];
  readonly last_attempt_at: string | null;
  readonly last_error_code: string | null;
  readonly last_error_text: string | null;
  readonly manual_fallback_text: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

const statusFilters = ["ALL", "QUEUED", "FAILED", "SUPPRESSED", "SENT", "CANCELLED"] as const;

function mapNotification(row: AdminNotificationRow): AdminNotificationDeliverySummary {
  return {
    notificationOutboxPk: row.notification_outbox_pk,
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    templateCode: row.template_code,
    audienceCode: row.audience_code,
    channelCode: row.channel_code,
    sendStatusCode: row.send_status_code,
    providerCode: row.provider_code,
    deliveryReasonCode: row.delivery_reason_code,
    businessContextTypeCode: row.business_context_type_code,
    providerMessageRef: row.provider_message_ref,
    destinationMaskedText: row.destination_masked_text,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    nextAttemptAt: row.next_attempt_at,
    retryCount: Number(row.retry_count),
    maxAttempts: Number(row.max_attempts),
    lastAttemptStatusCode: row.last_attempt_status_code,
    lastAttemptAt: row.last_attempt_at,
    lastErrorCode: row.last_error_code,
    lastErrorText: row.last_error_text,
    manualFallbackText: row.manual_fallback_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly status?: string; readonly channel?: string; readonly context?: string }>;
}) {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const params = await searchParams;
  const status = statusFilters.includes((params.status ?? "ALL").toUpperCase() as (typeof statusFilters)[number])
    ? (params.status ?? "ALL").toUpperCase()
    : "ALL";
  const channel = params.channel?.toUpperCase();
  const context = params.context?.toUpperCase();

  const supabase = await createClient();
  let query = supabase
    .from("api_admin_notification_delivery_summary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (status !== "ALL") query = query.eq("send_status_code", status);
  if (channel && ["EMAIL", "WHATSAPP"].includes(channel)) query = query.eq("channel_code", channel);
  if (context && ["ORDER", "INCIDENT"].includes(context)) query = query.eq("business_context_type_code", context);

  const { data, error } = await query;
  if (error) {
    throw new Error("Could not load notification delivery logs.");
  }

  const notifications = ((data ?? []) as AdminNotificationRow[]).map(mapNotification);

  return (
    <main id="main-content">
      <AdminNavHeader />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Transactional support</p>
            <h1 className="mt-2 text-3xl font-bold">Notification delivery logs</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Inspect queued, sent, failed, suppressed, and cancelled transactional messages without raw provider payloads or secrets.
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-[#1A5C38]/25 px-4 py-3 text-sm font-semibold text-[#1A5C38]" href="/admin">
            Admin home
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <Link
              key={filter}
              className={`rounded-full border px-3 py-2 text-xs font-semibold ${status === filter ? "border-[#1A5C38] bg-[#F2F8EF] text-[#1A5C38]" : "border-black/10 bg-white text-black/65"}`}
              href={`/admin/notifications${filter === "ALL" ? "" : `?status=${filter}`}`}
            >
              {filter}
            </Link>
          ))}
          <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65" href="/admin/notifications?channel=WHATSAPP">
            WhatsApp
          </Link>
          <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65" href="/admin/notifications?channel=EMAIL">
            Email
          </Link>
          <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65" href="/admin/notifications?context=ORDER">
            Orders
          </Link>
          <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65" href="/admin/notifications?context=INCIDENT">
            Incidents
          </Link>
        </div>

        <div className="mt-6">
          <NotificationsClient notifications={notifications} />
        </div>
      </section>
    </main>
  );
}
