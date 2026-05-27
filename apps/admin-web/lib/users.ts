import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { maskSupportSafe } from "@gozaika/utils";

export interface AdminUserSearchRow {
  readonly profilePk: string;
  readonly authUserId: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly maskedEmail: string;
  readonly maskedPhone: string;
  readonly isConsumer: boolean;
  readonly isRestaurantUser: boolean;
  readonly isPlatformUser: boolean;
  readonly lastSeenAt: string | null;
  readonly createdAt: string;
  readonly orderCount: number;
  readonly holdCount: number;
  readonly notificationCount: number;
  readonly consentCount: number;
  readonly auditCount: number;
}

type IamProfileRow = {
  readonly iam_profile_pk: string;
  readonly auth_user_fk: string;
  readonly display_name: string | null;
  readonly email_address: string | null;
  readonly phone_e164: string | null;
  readonly is_consumer: boolean;
  readonly is_restaurant_user: boolean;
  readonly is_platform_user: boolean;
  readonly last_seen_at: string | null;
  readonly created_at: string;
};

async function countBy(service: ReturnType<typeof createServiceRoleSupabaseClient>, table: string, column: string, value: string) {
  const { count } = await service.from(table).select("*", { count: "exact", head: true }).eq(column, value);
  return count ?? 0;
}

export async function searchAdminUsers(query: string): Promise<AdminUserSearchRow[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const service = createServiceRoleSupabaseClient();
  const safe = trimmed.replaceAll("%", "").replaceAll(",", " ");
  const { data, error } = await service
    .from("iam_profile")
    .select("iam_profile_pk,auth_user_fk,display_name,email_address,phone_e164,is_consumer,is_restaurant_user,is_platform_user,last_seen_at,created_at")
    .or(`display_name.ilike.%${safe}%,email_address.ilike.%${safe}%,phone_e164.ilike.%${safe}%`)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error("Could not search users.");
  }

  const rows = (data ?? []) as IamProfileRow[];
  return Promise.all(
    rows.map(async (row) => {
      const [{ data: consumer }, { count: consentCount }, auditCount] = await Promise.all([
        service.from("consumer_profile").select("consumer_profile_pk").eq("iam_profile_fk", row.iam_profile_pk).maybeSingle(),
        service.from("privacy_consent_event").select("*", { count: "exact", head: true }).eq("iam_profile_fk", row.iam_profile_pk),
        countBy(service, "audit_log", "target_entity_pk", row.iam_profile_pk),
      ]);
      const consumerPk = consumer?.consumer_profile_pk;
      const [orderCount, holdCount, notificationCount] = consumerPk
        ? await Promise.all([
            countBy(service, "order_order", "consumer_profile_fk", consumerPk),
            countBy(service, "drop_inventory_hold", "consumer_profile_fk", consumerPk),
            countBy(service, "notification_outbox", "recipient_profile_fk", row.iam_profile_pk),
          ])
        : [0, 0, 0];

      return {
        profilePk: row.iam_profile_pk,
        authUserId: row.auth_user_fk,
        displayName: row.display_name,
        email: row.email_address,
        phone: row.phone_e164,
        maskedEmail: maskSupportSafe(row.email_address),
        maskedPhone: maskSupportSafe(row.phone_e164),
        isConsumer: row.is_consumer,
        isRestaurantUser: row.is_restaurant_user,
        isPlatformUser: row.is_platform_user,
        lastSeenAt: row.last_seen_at,
        createdAt: row.created_at,
        orderCount,
        holdCount,
        notificationCount,
        consentCount: consentCount ?? 0,
        auditCount,
      };
    }),
  );
}
