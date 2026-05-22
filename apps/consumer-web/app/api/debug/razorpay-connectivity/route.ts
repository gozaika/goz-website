import { createHmac } from "node:crypto";
import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHECKOUT_CURRENCY_CODE = "INR";
const DEBUG_AMOUNT_PAISE = 5000;

type DebugResult = {
  readonly ok: boolean;
  readonly action: string;
  readonly logs: string[];
  readonly data?: Record<string, unknown>;
  readonly error?: string;
};

type RazorpayHttpResult = {
  readonly ok: boolean;
  readonly httpStatus: number;
  readonly statusText: string;
  readonly requestId: string | null;
  readonly body: unknown;
};

type HoldRow = {
  readonly drop_inventory_hold_pk: string;
  readonly drop_fk: string;
  readonly consumer_profile_fk: string;
  readonly hold_status_code: string;
  readonly quantity: number | string;
  readonly expires_at: string;
  readonly converted_order_fk?: string | null;
};

type DropRow = {
  readonly drop_drop_pk: string;
  readonly drop_title: string;
  readonly price_paise: number | string;
  readonly pickup_start_at?: string;
  readonly pickup_end_at: string;
  readonly restaurant_restaurant:
    | { readonly restaurant_name: string }
    | { readonly restaurant_name: string }[]
    | null;
  readonly catalog_bag_template_revision:
    | { readonly display_name: string }
    | { readonly display_name: string }[]
    | null;
};

type IntentRow = {
  readonly payment_order_intent_pk: string;
  readonly drop_inventory_hold_fk: string;
  readonly consumer_profile_fk: string;
  readonly order_fk: string | null;
  readonly provider_order_ref: string | null;
  readonly payment_intent_status_code: string;
  readonly amount_paise: number | string;
  readonly currency_code: string;
  readonly created_at?: string;
  readonly updated_at?: string;
};

type RazorpayPaymentEntity = {
  readonly id?: string;
  readonly order_id?: string;
  readonly amount?: number;
  readonly currency?: string;
  readonly status?: string;
  readonly method?: string;
  readonly fee?: number;
  readonly tax?: number;
  readonly captured_at?: number;
};

function mask(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function presentEnv(name: string) {
  const value = process.env[name];
  return {
    present: Boolean(value),
    length: value?.length ?? 0,
    maskedValue: mask(value),
  };
}

function razorpayKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "";
}

function razorpayCurrencyConfigError(keyId: string, currencyCode: string) {
  if (currencyCode === "INR" && /^rzp_(?:test|live)_us_/i.test(keyId)) {
    return "The configured Razorpay key appears to be a US account key, but goZaika checkout creates INR orders. Use an India Razorpay payment gateway key for INR checkout.";
  }

  return null;
}

function envSnapshot() {
  return {
    NEXT_PUBLIC_RAZORPAY_KEY_ID: presentEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID"),
    RAZORPAY_KEY_ID: presentEnv("RAZORPAY_KEY_ID"),
    RAZORPAY_KEY_SECRET: presentEnv("RAZORPAY_KEY_SECRET"),
    RAZORPAY_WEBHOOK_SECRET: presentEnv("RAZORPAY_WEBHOOK_SECRET"),
    NEXT_PUBLIC_SUPABASE_URL: presentEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: presentEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: presentEnv("SUPABASE_SERVICE_ROLE_KEY"),
    DEBUG_RAZORPAY_CONNECTIVITY_TOKEN: {
      present: Boolean(process.env.DEBUG_RAZORPAY_CONNECTIVITY_TOKEN),
      length: process.env.DEBUG_RAZORPAY_CONNECTIVITY_TOKEN?.length ?? 0,
    },
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    VERCEL_REGION: process.env.VERCEL_REGION ?? null,
  };
}

function append(logs: string[], stage: string, details: Record<string, unknown> = {}) {
  logs.push(`[${new Date().toISOString()}] ${stage} ${JSON.stringify(details)}`);
}

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function boolParam(url: URL, name: string) {
  const value = url.searchParams.get(name);
  return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes";
}

function uuidParam(url: URL, name: string) {
  const value = url.searchParams.get(name);
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function summarizeRazorpayOrder(body: unknown) {
  const order = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    id: order.id,
    amount: order.amount,
    amountPaid: order.amount_paid,
    currency: order.currency,
    status: order.status,
    receipt: order.receipt,
    attempts: order.attempts,
    notes: order.notes,
  };
}

function summarizePayment(payment: RazorpayPaymentEntity) {
  return {
    id: payment.id,
    orderId: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    fee: payment.fee,
    tax: payment.tax,
    capturedAt: payment.captured_at ? new Date(payment.captured_at * 1000).toISOString() : null,
  };
}

function responseBodyText(result: DebugResult) {
  const lines = [
    `ok=${result.ok}`,
    `action=${result.action}`,
    ...result.logs,
  ];

  if (result.error) {
    lines.push(`error=${result.error}`);
  }

  if (result.data) {
    lines.push("data=");
    lines.push(JSON.stringify(result.data, null, 2));
  }

  return `${lines.join("\n")}\n`;
}

function respond(request: Request, result: DebugResult, status = result.ok ? 200 : 500) {
  const url = new URL(request.url);
  const wantsJson = url.searchParams.get("format") === "json" || request.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json(result, { status });
  }

  return new NextResponse(responseBodyText(result), {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function razorpayFetch(path: string, init: RequestInit, keyId: string, keySecret: string): Promise<RazorpayHttpResult> {
  const response = await fetch(`https://api.razorpay.com${path}`, {
    ...init,
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const rawText = await response.text();
  let body: unknown = rawText;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = rawText;
  }

  return {
    ok: response.ok,
    httpStatus: response.status,
    statusText: response.statusText,
    requestId: response.headers.get("x-razorpay-request-id"),
    body,
  };
}

function requireRazorpayCredentials(logs: string[]) {
  const keyId = razorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  append(logs, "env.snapshot", {
    env: envSnapshot(),
    selectedKeyIdMasked: mask(keyId),
    selectedKeySource: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? "NEXT_PUBLIC_RAZORPAY_KEY_ID" : "RAZORPAY_KEY_ID",
  });

  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay key id or key secret.");
  }

  const currencyConfigError = razorpayCurrencyConfigError(keyId, CHECKOUT_CURRENCY_CODE);
  if (currencyConfigError) {
    throw new Error(currencyConfigError);
  }

  return { keyId, keySecret };
}

function currentOrigin(request: Request) {
  const url = new URL(request.url);
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return url.origin;
}

async function runSmoke(request: Request, logs: string[]) {
  const { keyId, keySecret } = requireRazorpayCredentials(logs);
  append(logs, "checkout.currency_guard.passed", { currency: CHECKOUT_CURRENCY_CODE });

  const scriptResponse = await fetch("https://checkout.razorpay.com/v1/checkout.js", { cache: "no-store" });
  append(logs, "razorpay.checkout_js.fetch", {
    ok: scriptResponse.ok,
    httpStatus: scriptResponse.status,
    statusText: scriptResponse.statusText,
    contentType: scriptResponse.headers.get("content-type"),
  });

  const requestBody = {
    amount: DEBUG_AMOUNT_PAISE,
    currency: CHECKOUT_CURRENCY_CODE,
    payment_capture: 1,
    receipt: `gz_debug_${Date.now()}`,
    notes: {
      source: "gozaika_razorpay_connectivity_smoke",
      origin: currentOrigin(request),
    },
  };
  append(logs, "razorpay.orders.create.request", {
    url: "https://api.razorpay.com/v1/orders",
    body: requestBody,
    authUserMasked: mask(keyId),
    authSecretMasked: mask(keySecret),
  });

  const orderResponse = await razorpayFetch(
    "/v1/orders",
    { method: "POST", body: JSON.stringify(requestBody) },
    keyId,
    keySecret,
  );
  append(logs, "razorpay.orders.create.response", {
    ok: orderResponse.ok,
    httpStatus: orderResponse.httpStatus,
    statusText: orderResponse.statusText,
    requestId: orderResponse.requestId,
    order: summarizeRazorpayOrder(orderResponse.body),
  });

  const providerOrderRef =
    orderResponse.body && typeof orderResponse.body === "object"
      ? ((orderResponse.body as Record<string, unknown>).id as string | undefined)
      : undefined;
  let fetchedOrder: RazorpayHttpResult | null = null;
  if (providerOrderRef) {
    fetchedOrder = await razorpayFetch(`/v1/orders/${encodeURIComponent(providerOrderRef)}`, { method: "GET" }, keyId, keySecret);
    append(logs, "razorpay.orders.fetch.response", {
      ok: fetchedOrder.ok,
      httpStatus: fetchedOrder.httpStatus,
      statusText: fetchedOrder.statusText,
      requestId: fetchedOrder.requestId,
      order: summarizeRazorpayOrder(fetchedOrder.body),
    });
  }

  append(logs, "next.step", {
    message:
      "Smoke test created a standalone Razorpay order only. To test the full goZaika lifecycle, create an active hold, then call action=create with holdPk.",
  });

  return {
    ok: orderResponse.ok,
    action: "smoke",
    logs,
    data: {
      env: envSnapshot(),
      standaloneOrder: summarizeRazorpayOrder(orderResponse.body),
      fetchedStandaloneOrder: fetchedOrder ? summarizeRazorpayOrder(fetchedOrder.body) : null,
    },
  } satisfies DebugResult;
}

async function loadHoldAndDrop(holdPk: string, logs: string[]) {
  const service = createServiceRoleSupabaseClient();
  const { data: hold, error: holdError } = await service
    .from("drop_inventory_hold")
    .select("drop_inventory_hold_pk,drop_fk,consumer_profile_fk,hold_status_code,quantity,expires_at,converted_order_fk")
    .eq("drop_inventory_hold_pk", holdPk)
    .maybeSingle();

  append(logs, "supabase.hold.lookup", {
    holdPk,
    found: Boolean(hold),
    error: holdError ? { message: holdError.message, code: holdError.code } : null,
  });

  if (holdError) throw new Error(`Could not load hold: ${holdError.message}`);
  if (!hold) throw new Error("Hold not found.");

  const holdRow = hold as HoldRow;
  const { data: drop, error: dropError } = await service
    .from("drop_drop")
    .select(
      "drop_drop_pk,drop_title,price_paise,pickup_start_at,pickup_end_at,restaurant_restaurant(restaurant_name),catalog_bag_template_revision(display_name)",
    )
    .eq("drop_drop_pk", holdRow.drop_fk)
    .maybeSingle();

  append(logs, "supabase.drop.lookup", {
    dropPk: holdRow.drop_fk,
    found: Boolean(drop),
    error: dropError ? { message: dropError.message, code: dropError.code } : null,
  });

  if (dropError) throw new Error(`Could not load drop: ${dropError.message}`);
  if (!drop) throw new Error("Drop not found.");

  return { service, hold: holdRow, drop: drop as DropRow };
}

async function runCreate(request: Request, logs: string[]) {
  const url = new URL(request.url);
  const holdPk = uuidParam(url, "holdPk");
  if (!holdPk) {
    throw new Error("Provide a valid holdPk query parameter.");
  }

  const { keyId, keySecret } = requireRazorpayCredentials(logs);
  const fresh = boolParam(url, "fresh");
  const { service, hold, drop } = await loadHoldAndDrop(holdPk, logs);

  append(logs, "supabase.hold.validation", {
    holdStatusCode: hold.hold_status_code,
    expiresAt: hold.expires_at,
    isExpired: Date.parse(hold.expires_at) <= Date.now(),
    convertedOrderFk: hold.converted_order_fk ?? null,
  });

  if (hold.hold_status_code !== "ACTIVE") {
    throw new Error(`Hold is not ACTIVE. Current status: ${hold.hold_status_code}.`);
  }
  if (Date.parse(hold.expires_at) <= Date.now()) {
    throw new Error("Hold has expired.");
  }
  if (Date.parse(drop.pickup_end_at) <= Date.now()) {
    throw new Error("Drop pickup window has closed.");
  }

  const amountPaise = Number(drop.price_paise) * Number(hold.quantity);
  const restaurant = singleRelation(drop.restaurant_restaurant);
  const revision = singleRelation(drop.catalog_bag_template_revision);
  append(logs, "checkout.amount.computed", {
    amountPaise,
    currencyCode: CHECKOUT_CURRENCY_CODE,
    quantity: Number(hold.quantity),
    pricePaise: Number(drop.price_paise),
    restaurantName: restaurant?.restaurant_name ?? null,
    bagDisplayName: revision?.display_name ?? drop.drop_title,
  });

  const reusableStatuses = ["CREATED", "RAZORPAY_ORDER_CREATED", "AUTHORIZED"];
  const { data: existingIntent, error: existingIntentError } = await service
    .from("payment_order_intent")
    .select(
      "payment_order_intent_pk,drop_inventory_hold_fk,consumer_profile_fk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code,created_at,updated_at",
    )
    .eq("drop_inventory_hold_fk", hold.drop_inventory_hold_pk)
    .eq("consumer_profile_fk", hold.consumer_profile_fk)
    .eq("amount_paise", amountPaise)
    .in("payment_intent_status_code", [...reusableStatuses, "CAPTURED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  append(logs, "supabase.intent.reusable_lookup", {
    found: Boolean(existingIntent),
    freshRequested: fresh,
    error: existingIntentError ? { message: existingIntentError.message, code: existingIntentError.code } : null,
  });

  if (existingIntentError) {
    throw new Error(`Could not inspect reusable payment intent: ${existingIntentError.message}`);
  }

  let intent = !fresh && existingIntent ? (existingIntent as IntentRow) : null;
  if (!intent) {
    const { data: createdIntent, error: intentError } = await service
      .from("payment_order_intent")
      .insert({
        drop_inventory_hold_fk: hold.drop_inventory_hold_pk,
        consumer_profile_fk: hold.consumer_profile_fk,
        provider_code: "RAZORPAY",
        payment_intent_status_code: "CREATED",
        amount_paise: amountPaise,
        currency_code: CHECKOUT_CURRENCY_CODE,
        idempotency_key: `debug:${hold.drop_inventory_hold_pk}:${Date.now()}`,
        expires_at: hold.expires_at,
      })
      .select(
        "payment_order_intent_pk,drop_inventory_hold_fk,consumer_profile_fk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code,created_at,updated_at",
      )
      .single();

    append(logs, "supabase.intent.create", {
      created: Boolean(createdIntent),
      error: intentError ? { message: intentError.message, code: intentError.code } : null,
    });

    if (intentError || !createdIntent) {
      throw new Error(`Could not create payment intent: ${intentError?.message ?? "unknown error"}`);
    }

    intent = createdIntent as IntentRow;
  }

  if (!intent.provider_order_ref) {
    const orderRequest = {
      amount: amountPaise,
      currency: CHECKOUT_CURRENCY_CODE,
      payment_capture: 1,
      receipt: `gz_${intent.payment_order_intent_pk.replaceAll("-", "").slice(0, 32)}`,
      notes: {
        source: "gozaika_razorpay_lifecycle_debug",
        hold_pk: hold.drop_inventory_hold_pk,
        payment_order_intent_pk: intent.payment_order_intent_pk,
      },
    };

    append(logs, "razorpay.orders.create.request", {
      url: "https://api.razorpay.com/v1/orders",
      body: orderRequest,
      authUserMasked: mask(keyId),
      authSecretMasked: mask(keySecret),
    });
    const orderResponse = await razorpayFetch(
      "/v1/orders",
      { method: "POST", body: JSON.stringify(orderRequest) },
      keyId,
      keySecret,
    );
    append(logs, "razorpay.orders.create.response", {
      ok: orderResponse.ok,
      httpStatus: orderResponse.httpStatus,
      statusText: orderResponse.statusText,
      requestId: orderResponse.requestId,
      order: summarizeRazorpayOrder(orderResponse.body),
      body: orderResponse.ok ? undefined : orderResponse.body,
    });

    const providerOrderRef =
      orderResponse.body && typeof orderResponse.body === "object"
        ? ((orderResponse.body as Record<string, unknown>).id as string | undefined)
        : undefined;
    if (!orderResponse.ok || !providerOrderRef) {
      await service
        .from("payment_order_intent")
        .update({ payment_intent_status_code: "FAILED", updated_at: new Date().toISOString() })
        .eq("payment_order_intent_pk", intent.payment_order_intent_pk);
      throw new Error("Razorpay order creation failed.");
    }

    const { data: updatedIntent, error: updateError } = await service
      .from("payment_order_intent")
      .update({
        provider_order_ref: providerOrderRef,
        payment_intent_status_code: "RAZORPAY_ORDER_CREATED",
        updated_at: new Date().toISOString(),
      })
      .eq("payment_order_intent_pk", intent.payment_order_intent_pk)
      .select(
        "payment_order_intent_pk,drop_inventory_hold_fk,consumer_profile_fk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code,created_at,updated_at",
      )
      .single();

    append(logs, "supabase.intent.attach_provider_order", {
      providerOrderRef,
      updated: Boolean(updatedIntent),
      error: updateError ? { message: updateError.message, code: updateError.code } : null,
    });

    if (updateError || !updatedIntent) {
      throw new Error(`Could not attach Razorpay order to intent: ${updateError?.message ?? "unknown error"}`);
    }

    intent = updatedIntent as IntentRow;
  } else {
    append(logs, "supabase.intent.reused", {
      paymentOrderIntentPk: intent.payment_order_intent_pk,
      providerOrderRef: intent.provider_order_ref,
      status: intent.payment_intent_status_code,
    });
  }

  append(logs, "manual.payment.step", {
    message:
      "Open the normal checkout page for this hold and complete Razorpay payment. Then run action=poll. Server-side diagnostics cannot type card/UPI credentials into Razorpay checkout.",
    checkoutPage: `${currentOrigin(request)}/checkout/${hold.drop_inventory_hold_pk}`,
  });

  return {
    ok: true,
    action: "create",
    logs,
    data: {
      env: envSnapshot(),
      hold: {
        holdPk: hold.drop_inventory_hold_pk,
        status: hold.hold_status_code,
        expiresAt: hold.expires_at,
      },
      intent,
      checkoutOptions: {
        key: mask(keyId),
        amount: amountPaise,
        currency: CHECKOUT_CURRENCY_CODE,
        name: "goZaika",
        description: `${revision?.display_name ?? drop.drop_title} from ${restaurant?.restaurant_name ?? "goZaika partner"}`,
        order_id: intent.provider_order_ref,
      },
      commands: {
        poll: `curl -H "Authorization: Bearer $DEBUG_RAZORPAY_CONNECTIVITY_TOKEN" "${currentOrigin(request)}/api/debug/razorpay-connectivity?action=poll&paymentOrderIntentPk=${intent.payment_order_intent_pk}"`,
        replayWebhookAfterPayment: `curl -H "Authorization: Bearer $DEBUG_RAZORPAY_CONNECTIVITY_TOKEN" "${currentOrigin(request)}/api/debug/razorpay-connectivity?action=replay-webhook&paymentOrderIntentPk=${intent.payment_order_intent_pk}"`,
      },
    },
  } satisfies DebugResult;
}

async function resolveIntent(url: URL, logs: string[]) {
  const paymentOrderIntentPk = uuidParam(url, "paymentOrderIntentPk");
  const providerOrderRef = url.searchParams.get("providerOrderRef");
  const service = createServiceRoleSupabaseClient();

  let query = service
    .from("payment_order_intent")
    .select(
      "payment_order_intent_pk,drop_inventory_hold_fk,consumer_profile_fk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code,created_at,updated_at",
    );

  if (paymentOrderIntentPk) {
    query = query.eq("payment_order_intent_pk", paymentOrderIntentPk);
  } else if (providerOrderRef) {
    query = query.eq("provider_order_ref", providerOrderRef);
  } else {
    throw new Error("Provide paymentOrderIntentPk or providerOrderRef.");
  }

  const { data, error } = await query.maybeSingle();
  append(logs, "supabase.intent.lookup", {
    paymentOrderIntentPk,
    providerOrderRef,
    found: Boolean(data),
    error: error ? { message: error.message, code: error.code } : null,
  });

  if (error) throw new Error(`Could not load payment intent: ${error.message}`);
  if (!data) throw new Error("Payment intent not found.");

  return { service, intent: data as IntentRow };
}

function paymentsFromOrderPaymentsResponse(body: unknown): RazorpayPaymentEntity[] {
  if (!body || typeof body !== "object") return [];
  const items = (body as { readonly items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is RazorpayPaymentEntity => Boolean(item && typeof item === "object"));
}

function withoutRawPayload(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== "object") return {};
  const copy = { ...(row as Record<string, unknown>) };
  delete copy.raw_payload_json;
  return copy;
}

async function queryLocalLifecycleState(service: ReturnType<typeof createServiceRoleSupabaseClient>, intent: IntentRow, logs: string[]) {
  const [holdResult, orderResult, transactionsResult, webhookResult] = await Promise.all([
    service
      .from("drop_inventory_hold")
      .select("drop_inventory_hold_pk,hold_status_code,converted_order_fk,expires_at")
      .eq("drop_inventory_hold_pk", intent.drop_inventory_hold_fk)
      .maybeSingle(),
    intent.order_fk
      ? service
          .from("order_order")
          .select("order_order_pk,order_number,order_status_code,payment_status_code,created_at,updated_at")
          .eq("order_order_pk", intent.order_fk)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    service
      .from("payment_transaction")
      .select("payment_transaction_pk,provider_payment_ref,transaction_status_code,amount_paise,payment_method_code,captured_at,created_at,updated_at")
      .eq("payment_order_intent_fk", intent.payment_order_intent_pk)
      .order("created_at", { ascending: false }),
    service
      .from("payment_webhook_event")
      .select(
        "payment_webhook_event_pk,provider_event_id,event_type_code,signature_verified_flag,processing_status_code,processed_at,processing_error_text,received_at,raw_payload_json",
      )
      .eq("provider_code", "RAZORPAY")
      .order("received_at", { ascending: false })
      .limit(50),
  ]);

  const providerOrderRef = intent.provider_order_ref;
  const webhookRows = (webhookResult.data ?? []).filter((row) => {
    const payload = (row as { readonly raw_payload_json?: unknown }).raw_payload_json as Record<string, unknown> | undefined;
    const payment = payload?.payload && typeof payload.payload === "object" ? (payload.payload as Record<string, unknown>).payment : null;
    const entity = payment && typeof payment === "object" ? (payment as Record<string, unknown>).entity : null;
    return Boolean(
      providerOrderRef &&
        entity &&
        typeof entity === "object" &&
        (entity as Record<string, unknown>).order_id === providerOrderRef,
    );
  });

  append(logs, "supabase.lifecycle.state", {
    hold: holdResult.data,
    order: orderResult.data,
    transactions: transactionsResult.data ?? [],
    webhookEventsForOrder: webhookRows.map(withoutRawPayload),
    errors: {
      hold: holdResult.error?.message ?? null,
      order: orderResult.error?.message ?? null,
      transactions: transactionsResult.error?.message ?? null,
      webhookEvents: webhookResult.error?.message ?? null,
    },
  });

  return {
    hold: holdResult.data,
    order: orderResult.data,
    transactions: transactionsResult.data ?? [],
    webhookEventsForOrder: webhookRows.map(withoutRawPayload),
  };
}

async function runPoll(request: Request, logs: string[]) {
  const url = new URL(request.url);
  const { keyId, keySecret } = requireRazorpayCredentials(logs);
  const { service, intent } = await resolveIntent(url, logs);

  if (!intent.provider_order_ref) {
    throw new Error("Payment intent does not have a Razorpay provider_order_ref yet.");
  }

  const orderResponse = await razorpayFetch(`/v1/orders/${encodeURIComponent(intent.provider_order_ref)}`, { method: "GET" }, keyId, keySecret);
  append(logs, "razorpay.orders.fetch.response", {
    ok: orderResponse.ok,
    httpStatus: orderResponse.httpStatus,
    statusText: orderResponse.statusText,
    requestId: orderResponse.requestId,
    order: summarizeRazorpayOrder(orderResponse.body),
    body: orderResponse.ok ? undefined : orderResponse.body,
  });

  const paymentsResponse = await razorpayFetch(
    `/v1/orders/${encodeURIComponent(intent.provider_order_ref)}/payments`,
    { method: "GET" },
    keyId,
    keySecret,
  );
  const payments = paymentsFromOrderPaymentsResponse(paymentsResponse.body);
  append(logs, "razorpay.orders.payments.response", {
    ok: paymentsResponse.ok,
    httpStatus: paymentsResponse.httpStatus,
    statusText: paymentsResponse.statusText,
    requestId: paymentsResponse.requestId,
    payments: payments.map(summarizePayment),
    body: paymentsResponse.ok ? undefined : paymentsResponse.body,
  });

  const capturedPayment = payments.find((payment) => payment.status === "captured") ?? null;
  append(logs, "razorpay.payment.captured_check", {
    captured: Boolean(capturedPayment),
    payment: capturedPayment ? summarizePayment(capturedPayment) : null,
  });

  const localState = await queryLocalLifecycleState(service, intent, logs);
  if (capturedPayment && localState.webhookEventsForOrder.length === 0) {
    append(logs, "diagnosis.webhook_missing", {
      message:
        "Razorpay shows a captured payment, but no matching payment_webhook_event row was found. Check the Razorpay webhook URL, Supabase function JWT setting, and function logs. You can run action=replay-webhook to isolate Supabase webhook/RPC processing.",
    });
  }
  if (capturedPayment && localState.webhookEventsForOrder.some((event) => event.processing_status_code === "FAILED")) {
    append(logs, "diagnosis.webhook_processing_failed", {
      message: "A matching webhook reached Supabase but failed during processing. Inspect processing_error_text in the data block.",
    });
  }
  if (capturedPayment && intent.payment_intent_status_code !== "CAPTURED") {
    append(logs, "diagnosis.intent_not_captured", {
      message: "Razorpay payment is captured, but the local intent is not CAPTURED yet.",
    });
  }

  return {
    ok: orderResponse.ok && paymentsResponse.ok,
    action: "poll",
    logs,
    data: {
      env: envSnapshot(),
      intent,
      razorpayOrder: summarizeRazorpayOrder(orderResponse.body),
      razorpayPayments: payments.map(summarizePayment),
      localState,
      commands: capturedPayment
        ? {
            replayWebhook: `curl -H "Authorization: Bearer $DEBUG_RAZORPAY_CONNECTIVITY_TOKEN" "${currentOrigin(request)}/api/debug/razorpay-connectivity?action=replay-webhook&paymentOrderIntentPk=${intent.payment_order_intent_pk}&paymentId=${capturedPayment.id}"`,
          }
        : null,
    },
  } satisfies DebugResult;
}

async function runReplayWebhook(request: Request, logs: string[]) {
  const url = new URL(request.url);
  const { keyId, keySecret } = requireRazorpayCredentials(logs);
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  const { service, intent } = await resolveIntent(url, logs);
  if (!intent.provider_order_ref) {
    throw new Error("Payment intent does not have a Razorpay provider_order_ref yet.");
  }

  const requestedPaymentId = url.searchParams.get("paymentId");
  let payment: RazorpayPaymentEntity | null = null;
  if (requestedPaymentId) {
    const paymentResponse = await razorpayFetch(`/v1/payments/${encodeURIComponent(requestedPaymentId)}`, { method: "GET" }, keyId, keySecret);
    append(logs, "razorpay.payments.fetch.response", {
      ok: paymentResponse.ok,
      httpStatus: paymentResponse.httpStatus,
      statusText: paymentResponse.statusText,
      requestId: paymentResponse.requestId,
      payment: paymentResponse.ok ? summarizePayment(paymentResponse.body as RazorpayPaymentEntity) : null,
      body: paymentResponse.ok ? undefined : paymentResponse.body,
    });
    if (!paymentResponse.ok) {
      throw new Error("Could not fetch requested Razorpay payment.");
    }
    payment = paymentResponse.body as RazorpayPaymentEntity;
  } else {
    const paymentsResponse = await razorpayFetch(
      `/v1/orders/${encodeURIComponent(intent.provider_order_ref)}/payments`,
      { method: "GET" },
      keyId,
      keySecret,
    );
    const payments = paymentsFromOrderPaymentsResponse(paymentsResponse.body);
    payment = payments.find((item) => item.status === "captured") ?? payments[0] ?? null;
    append(logs, "razorpay.orders.payments.select_for_replay", {
      ok: paymentsResponse.ok,
      httpStatus: paymentsResponse.httpStatus,
      selectedPayment: payment ? summarizePayment(payment) : null,
      payments: payments.map(summarizePayment),
    });
  }

  if (!payment?.id || payment.order_id !== intent.provider_order_ref) {
    throw new Error("No Razorpay payment was found for this provider order ref.");
  }
  if (payment.status !== "captured") {
    throw new Error(`Selected payment is not captured. Current Razorpay status: ${payment.status ?? "unknown"}.`);
  }

  const payload = {
    entity: "event",
    account_id: "debug_replay",
    event: "payment.captured",
    contains: ["payment"],
    payload: {
      payment: {
        entity: {
          id: payment.id,
          entity: "payment",
          amount: payment.amount ?? Number(intent.amount_paise),
          currency: payment.currency ?? intent.currency_code,
          status: "captured",
          order_id: payment.order_id,
          method: payment.method ?? "debug",
          fee: payment.fee ?? 0,
          tax: payment.tax ?? 0,
          captured_at: payment.captured_at ?? Math.floor(Date.now() / 1000),
          notes: {
            source: "gozaika_razorpay_debug_replay",
            payment_order_intent_pk: intent.payment_order_intent_pk,
          },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
    id: `debug_replay_${payment.id}_${Date.now()}`,
  };
  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const includeSupabaseAuth = boolParam(url, "includeSupabaseAuth");
  const webhookUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/razorpay-webhook`;
  append(logs, "supabase.webhook.replay.request", {
    url: webhookUrl,
    signedWithWebhookSecretMasked: mask(webhookSecret),
    includeSupabaseAuth,
    providerOrderRef: intent.provider_order_ref,
    providerPaymentRef: payment.id,
    note:
      "includeSupabaseAuth=false matches real Razorpay delivery. If this returns a platform 401, configure the Supabase razorpay-webhook function with verify_jwt=false.",
  });

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-razorpay-signature": signature,
  };
  if (includeSupabaseAuth && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    headers.authorization = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  }

  const webhookResponse = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: rawBody,
  });
  const webhookText = await webhookResponse.text();
  let webhookBody: unknown = webhookText;
  try {
    webhookBody = webhookText ? JSON.parse(webhookText) : null;
  } catch {
    webhookBody = webhookText;
  }

  append(logs, "supabase.webhook.replay.response", {
    ok: webhookResponse.ok,
    httpStatus: webhookResponse.status,
    statusText: webhookResponse.statusText,
    body: webhookBody,
  });

  const { data: refreshedIntent, error: refreshedIntentError } = await service
    .from("payment_order_intent")
    .select(
      "payment_order_intent_pk,drop_inventory_hold_fk,consumer_profile_fk,order_fk,provider_order_ref,payment_intent_status_code,amount_paise,currency_code,created_at,updated_at",
    )
    .eq("payment_order_intent_pk", intent.payment_order_intent_pk)
    .maybeSingle();
  append(logs, "supabase.intent.after_replay", {
    intent: refreshedIntent,
    error: refreshedIntentError ? { message: refreshedIntentError.message, code: refreshedIntentError.code } : null,
  });

  const localState = await queryLocalLifecycleState(service, (refreshedIntent as IntentRow | null) ?? intent, logs);
  return {
    ok: webhookResponse.ok,
    action: "replay-webhook",
    logs,
    data: {
      env: envSnapshot(),
      replayedPayloadSummary: {
        event: payload.event,
        id: payload.id,
        providerOrderRef: payment.order_id,
        providerPaymentRef: payment.id,
        amount: payment.amount ?? Number(intent.amount_paise),
        currency: payment.currency ?? intent.currency_code,
      },
      webhook: {
        url: webhookUrl,
        httpStatus: webhookResponse.status,
        statusText: webhookResponse.statusText,
        body: webhookBody,
      },
      intentAfterReplay: refreshedIntent,
      localState,
      commands: {
        poll: `curl -H "Authorization: Bearer $DEBUG_RAZORPAY_CONNECTIVITY_TOKEN" "${currentOrigin(request)}/api/debug/razorpay-connectivity?action=poll&paymentOrderIntentPk=${intent.payment_order_intent_pk}"`,
        retryReplayWithSupabaseAuth:
          webhookResponse.status === 401 && !includeSupabaseAuth
            ? `curl -H "Authorization: Bearer $DEBUG_RAZORPAY_CONNECTIVITY_TOKEN" "${currentOrigin(request)}/api/debug/razorpay-connectivity?action=replay-webhook&paymentOrderIntentPk=${intent.payment_order_intent_pk}&paymentId=${payment.id}&includeSupabaseAuth=1"`
            : null,
      },
    },
  } satisfies DebugResult;
}

async function run(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expectedToken = process.env.DEBUG_RAZORPAY_CONNECTIVITY_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return respond(
      request,
      {
        ok: false,
        action: "auth",
        logs: [
          `[${new Date().toISOString()}] auth.failed ${JSON.stringify({
            debugTokenPresent: Boolean(expectedToken),
            debugTokenLength: expectedToken?.length ?? 0,
          })}`,
        ],
        error: "Unauthorized",
      },
      401,
    );
  }

  const logs: string[] = [];
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "smoke";
  append(logs, "debug.start", { action, url: request.url.replace(/([?&](?:token|secret|key)=)[^&]+/gi, "$1[redacted]") });

  try {
    if (action === "smoke") {
      return respond(request, await runSmoke(request, logs));
    }
    if (action === "create") {
      return respond(request, await runCreate(request, logs));
    }
    if (action === "poll") {
      return respond(request, await runPoll(request, logs));
    }
    if (action === "replay-webhook") {
      return respond(request, await runReplayWebhook(request, logs));
    }

    return respond(
      request,
      {
        ok: false,
        action,
        logs,
        error: "Unknown action. Use smoke, create, poll, or replay-webhook.",
      },
      400,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    append(logs, "debug.failed", { error: message });
    return respond(
      request,
      {
        ok: false,
        action,
        logs,
        data: { env: envSnapshot() },
        error: message,
      },
      500,
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
