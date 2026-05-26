import type {
  AdminOpsAuditRow,
  AdminOpsConfigFlagRow,
  AdminOpsDropSummary,
  AdminOpsIncidentQueueRow,
  AdminOpsRefundQueueRow,
  AdminOpsRestaurantSummary,
  AdminOpsSupportTicketRow,
} from "@gozaika/types";

type Numberish = number | string;

export type AdminOpsRestaurantRow = {
  readonly restaurant_pk: string;
  readonly restaurant_name: string;
  readonly restaurant_slug: string;
  readonly status_code: string;
  readonly open_incident_count: Numberish;
  readonly open_support_ticket_count: Numberish;
  readonly open_refund_request_count: Numberish;
  readonly active_drop_count: Numberish;
  readonly paused_drop_count: Numberish;
  readonly latest_audit_at: string | null;
  readonly updated_at: string;
};

export type AdminOpsDropRow = {
  readonly drop_pk: string;
  readonly restaurant_fk: string;
  readonly restaurant_name: string;
  readonly drop_title: string;
  readonly status_code: string;
  readonly quantity_total: Numberish;
  readonly quantity_available: Numberish;
  readonly paid_order_count: Numberish;
  readonly pickup_start_at: string;
  readonly pickup_end_at: string;
  readonly updated_at: string;
};

export type AdminOpsSupportRow = {
  readonly support_ticket_pk: string;
  readonly restaurant_fk: string | null;
  readonly restaurant_name: string | null;
  readonly order_fk: string | null;
  readonly order_number: string | null;
  readonly incident_fk: string | null;
  readonly refund_pk: string | null;
  readonly type_code: string;
  readonly status_code: string;
  readonly priority_code: string;
  readonly subject_text: string;
  readonly description_text: string | null;
  readonly assigned_to_profile_fk: string | null;
  readonly sla_due_at: string | null;
  readonly resolved_at: string | null;
  readonly latest_event_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type AdminOpsIncidentRow = {
  readonly incident_pk: string;
  readonly restaurant_fk: string | null;
  readonly restaurant_name: string | null;
  readonly order_fk: string | null;
  readonly order_number: string | null;
  readonly support_ticket_fk: string | null;
  readonly type_code: string;
  readonly severity_code: string;
  readonly status_code: string;
  readonly title_text: string;
  readonly description_text: string | null;
  readonly assigned_to_profile_fk: string | null;
  readonly latest_event_at: string | null;
  readonly occurred_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type AdminOpsRefundRow = {
  readonly refund_pk: string;
  readonly restaurant_fk: string;
  readonly restaurant_name: string;
  readonly order_fk: string;
  readonly order_number: string;
  readonly support_ticket_fk: string | null;
  readonly incident_fk: string | null;
  readonly refund_status_code: string;
  readonly tracking_status_code: string;
  readonly refund_reason_code: string;
  readonly amount_paise: Numberish;
  readonly requested_at: string;
  readonly processed_at: string | null;
  readonly updated_at: string;
};

export type AdminOpsConfigRow = {
  readonly config_pk: string;
  readonly flag_code: string;
  readonly flag_name: string;
  readonly description: string | null;
  readonly scope_code: string;
  readonly scope_entity_pk: string | null;
  readonly scope_label: string;
  readonly is_enabled: boolean;
  readonly numeric_value: Numberish | null;
  readonly consumed_by_text: string;
  readonly updated_at: string;
};

export type AdminOpsAuditDbRow = {
  readonly audit_log_pk: string;
  readonly actor_profile_fk: string | null;
  readonly actor_role_code: string | null;
  readonly action_code: string;
  readonly target_entity_type_code: string | null;
  readonly target_entity_pk: string | null;
  readonly reason_text: string | null;
  readonly created_at: string;
};

export function mapOpsRestaurant(row: AdminOpsRestaurantRow): AdminOpsRestaurantSummary {
  return {
    restaurantPk: row.restaurant_pk,
    restaurantName: row.restaurant_name,
    restaurantSlug: row.restaurant_slug,
    statusCode: row.status_code,
    openIncidentCount: Number(row.open_incident_count),
    openSupportTicketCount: Number(row.open_support_ticket_count),
    openRefundRequestCount: Number(row.open_refund_request_count),
    activeDropCount: Number(row.active_drop_count),
    pausedDropCount: Number(row.paused_drop_count),
    latestAuditAt: row.latest_audit_at,
    updatedAt: row.updated_at,
  };
}

export function mapOpsDrop(row: AdminOpsDropRow): AdminOpsDropSummary {
  return {
    dropPk: row.drop_pk,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    dropTitle: row.drop_title,
    statusCode: row.status_code,
    quantityTotal: Number(row.quantity_total),
    quantityAvailable: Number(row.quantity_available),
    paidOrderCount: Number(row.paid_order_count),
    pickupStartAt: row.pickup_start_at,
    pickupEndAt: row.pickup_end_at,
    updatedAt: row.updated_at,
  };
}

export function mapOpsSupport(row: AdminOpsSupportRow): AdminOpsSupportTicketRow {
  return {
    supportTicketPk: row.support_ticket_pk,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    orderPk: row.order_fk,
    orderNumber: row.order_number,
    incidentPk: row.incident_fk,
    refundPk: row.refund_pk,
    typeCode: row.type_code,
    statusCode: row.status_code,
    priorityCode: row.priority_code,
    subjectText: row.subject_text,
    descriptionText: row.description_text,
    assignedToProfilePk: row.assigned_to_profile_fk,
    slaDueAt: row.sla_due_at,
    resolvedAt: row.resolved_at,
    latestEventAt: row.latest_event_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOpsIncident(row: AdminOpsIncidentRow): AdminOpsIncidentQueueRow {
  return {
    incidentPk: row.incident_pk,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    orderPk: row.order_fk,
    orderNumber: row.order_number,
    supportTicketPk: row.support_ticket_fk,
    typeCode: row.type_code,
    severityCode: row.severity_code,
    statusCode: row.status_code,
    titleText: row.title_text,
    descriptionText: row.description_text,
    assignedToProfilePk: row.assigned_to_profile_fk,
    latestEventAt: row.latest_event_at,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOpsRefund(row: AdminOpsRefundRow): AdminOpsRefundQueueRow {
  return {
    refundPk: row.refund_pk,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    orderPk: row.order_fk,
    orderNumber: row.order_number,
    supportTicketPk: row.support_ticket_fk,
    incidentPk: row.incident_fk,
    refundStatusCode: row.refund_status_code,
    trackingStatusCode: row.tracking_status_code,
    refundReasonCode: row.refund_reason_code,
    amountPaise: Number(row.amount_paise),
    requestedAt: row.requested_at,
    processedAt: row.processed_at,
    updatedAt: row.updated_at,
  };
}

export function mapOpsConfig(row: AdminOpsConfigRow): AdminOpsConfigFlagRow {
  return {
    configPk: row.config_pk,
    flagCode: row.flag_code,
    flagName: row.flag_name,
    description: row.description,
    scopeCode: row.scope_code,
    scopeEntityPk: row.scope_entity_pk,
    scopeLabel: row.scope_label,
    isEnabled: row.is_enabled,
    numericValue: row.numeric_value == null ? null : Number(row.numeric_value),
    consumedByText: row.consumed_by_text,
    updatedAt: row.updated_at,
  };
}

export function mapOpsAudit(row: AdminOpsAuditDbRow): AdminOpsAuditRow {
  return {
    auditLogPk: row.audit_log_pk,
    actorProfilePk: row.actor_profile_fk,
    actorRoleCode: row.actor_role_code,
    actionCode: row.action_code,
    targetEntityTypeCode: row.target_entity_type_code,
    targetEntityPk: row.target_entity_pk,
    reasonText: row.reason_text,
    createdAt: row.created_at,
  };
}
