import { jsonResponse, safeLog } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type NotificationRow = {
  readonly notification_outbox_pk: string;
  readonly template_code: string;
  readonly channel_code: "EMAIL" | "WHATSAPP" | string;
  readonly provider_code: string | null;
  readonly resolved_destination_text: string;
  readonly subject_template: string | null;
  readonly body_template: string | null;
  readonly provider_template_ref: string | null;
  readonly payload_json: Record<string, unknown> | null;
  readonly manual_fallback_text: string | null;
};

type SendResult = {
  readonly ok: boolean;
  readonly providerCode: string;
  readonly providerMessageRef?: string | null;
  readonly errorCode?: string | null;
  readonly errorText?: string | null;
  readonly providerStatusCode?: string | null;
  readonly retryAfterSeconds?: number | null;
};

function optionalEnv(name: string): string | null {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

function dryRunEnabled(): boolean {
  return ["1", "true", "yes"].includes((Deno.env.get("NOTIFICATION_DRY_RUN") ?? "").toLowerCase());
}

function renderTemplate(template: string | null, payload: Record<string, unknown> | null): string {
  const values = payload ?? {};
  return (template ?? "")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
      const value = values[key];
      return value == null ? "" : String(value);
    })
    .trim();
}

function templateParameters(payload: Record<string, unknown> | null): { name: string; value: string }[] {
  return Object.entries(payload ?? {}).map(([name, value]) => ({
    name,
    value: value == null ? "" : String(value),
  }));
}

async function sendEmail(row: NotificationRow): Promise<SendResult> {
  if (dryRunEnabled()) {
    return { ok: true, providerCode: "DRY_RUN", providerMessageRef: `dry_run_${row.notification_outbox_pk}` };
  }

  const apiKey = optionalEnv("RESEND_API_KEY");
  const fromEmail = optionalEnv("NOTIFICATION_RESEND_FROM_EMAIL") ?? optionalEnv("RESEND_FROM_EMAIL");
  if (!apiKey || !fromEmail) {
    return {
      ok: false,
      providerCode: "RESEND",
      errorCode: "PROVIDER_NOT_CONFIGURED",
      errorText: "Resend notification environment variables are not configured.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [row.resolved_destination_text],
      subject: renderTemplate(row.subject_template, row.payload_json) || "goZaika notification",
      text: renderTemplate(row.body_template, row.payload_json) || row.manual_fallback_text || "goZaika update.",
    }),
  });

  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok || !payload.id) {
    return {
      ok: false,
      providerCode: "RESEND",
      providerStatusCode: String(response.status),
      errorCode: "PROVIDER_SEND_FAILED",
      errorText: payload.message ?? payload.name ?? "Resend send failed.",
      retryAfterSeconds: 300,
    };
  }

  return {
    ok: true,
    providerCode: "RESEND",
    providerMessageRef: payload.id,
    providerStatusCode: String(response.status),
  };
}

async function sendWhatsApp(row: NotificationRow): Promise<SendResult> {
  if (dryRunEnabled()) {
    return { ok: true, providerCode: "DRY_RUN", providerMessageRef: `dry_run_${row.notification_outbox_pk}` };
  }

  const apiBaseUrl = optionalEnv("WATI_API_BASE_URL");
  const apiToken = optionalEnv("WATI_API_TOKEN");
  const broadcastName = optionalEnv("WATI_BROADCAST_NAME") ?? "gozaika_transactional";
  if (!apiBaseUrl || !apiToken || !row.provider_template_ref) {
    return {
      ok: false,
      providerCode: "WATI",
      errorCode: "PROVIDER_NOT_CONFIGURED",
      errorText: "WATI notification environment variables or template mapping are not configured.",
    };
  }

  const phone = row.resolved_destination_text.replace(/^\+/, "");
  const endpoint = `${apiBaseUrl.replace(/\/+$/, "")}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(phone)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      template_name: row.provider_template_ref,
      broadcast_name: broadcastName,
      parameters: templateParameters(row.payload_json),
    }),
  });

  const payload = await response.json().catch(() => ({})) as {
    result?: boolean;
    id?: string;
    messageId?: string;
    message?: string;
    info?: string;
  };
  if (!response.ok || payload.result === false) {
    return {
      ok: false,
      providerCode: "WATI",
      providerStatusCode: String(response.status),
      errorCode: "PROVIDER_SEND_FAILED",
      errorText: payload.message ?? payload.info ?? "WATI send failed.",
      retryAfterSeconds: 300,
    };
  }

  return {
    ok: true,
    providerCode: "WATI",
    providerMessageRef: payload.messageId ?? payload.id ?? null,
    providerStatusCode: String(response.status),
  };
}

async function sendNotification(row: NotificationRow): Promise<SendResult> {
  if (row.channel_code === "EMAIL") return sendEmail(row);
  if (row.channel_code === "WHATSAPP") return sendWhatsApp(row);

  return {
    ok: false,
    providerCode: row.provider_code ?? "SYSTEM",
    errorCode: "CHANNEL_NOT_SUPPORTED",
    errorText: "This notification channel is not supported by the Slice 6 worker.",
  };
}

Deno.serve(async (request) => {
  if (!["POST", "GET"].includes(request.method)) {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const batchSize = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? 25), 1), 100);
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase.rpc("api_claim_notification_batch", {
    p_batch_size: batchSize,
  });

  if (error) {
    safeLog("notification_worker_claim_failed");
    return jsonResponse({ ok: false, error: "Could not claim notification batch." }, 500);
  }

  let sent = 0;
  let failed = 0;
  for (const row of (rows ?? []) as NotificationRow[]) {
    const result = await sendNotification(row);
    const { error: attemptError } = await supabase.rpc("api_record_notification_delivery_attempt", {
      p_notification_outbox_pk: row.notification_outbox_pk,
      p_attempt_status_code: result.ok ? "SENT" : "FAILED",
      p_provider_code: result.providerCode,
      p_provider_message_ref: result.providerMessageRef ?? null,
      p_error_code: result.errorCode ?? null,
      p_error_text: result.errorText ?? null,
      p_provider_status_code: result.providerStatusCode ?? null,
      p_retry_after_seconds: result.retryAfterSeconds ?? null,
    });

    if (attemptError) {
      failed += 1;
      safeLog("notification_worker_attempt_record_failed", { notification: row.notification_outbox_pk });
      continue;
    }

    if (result.ok) sent += 1;
    else failed += 1;
  }

  safeLog("notification_worker_completed", { claimed: rows?.length ?? 0, sent, failed });
  return jsonResponse({ ok: true, claimed: rows?.length ?? 0, sent, failed, dryRun: dryRunEnabled() });
});
