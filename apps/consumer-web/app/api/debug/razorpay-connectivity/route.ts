import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function envSnapshot() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  return {
    NEXT_PUBLIC_RAZORPAY_KEY_ID: {
      present: Boolean(keyId),
      length: keyId?.length ?? 0,
      maskedValue: mask(keyId),
    },
    RAZORPAY_KEY_SECRET: {
      present: Boolean(keySecret),
      length: keySecret?.length ?? 0,
      maskedValue: mask(keySecret),
    },
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    VERCEL_REGION: process.env.VERCEL_REGION ?? null,
  };
}

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expectedToken = process.env.DEBUG_RAZORPAY_CONNECTIVITY_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
        env: {
          DEBUG_RAZORPAY_CONNECTIVITY_TOKEN: {
            present: Boolean(expectedToken),
            length: expectedToken?.length ?? 0,
          },
        },
      },
      { status: 401 },
    );
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const env = envSnapshot();

  if (!keyId || !keySecret) {
    return NextResponse.json(
      {
        ok: false,
        stage: "env_validation",
        error: "Missing Razorpay environment variable.",
        env,
      },
      { status: 500 },
    );
  }

  const requestBody = {
    amount: 100,
    currency: "INR",
    receipt: `gz_debug_${Date.now()}`,
    notes: {
      source: "gozaika_vercel_connectivity_test",
    },
  };

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await response.text();
    let parsedBody: unknown = null;

    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = rawText;
    }

    return NextResponse.json(
      {
        ok: response.ok,
        stage: "razorpay_orders_api",
        httpStatus: response.status,
        statusText: response.statusText,
        env,
        request: {
          url: "https://api.razorpay.com/v1/orders",
          method: "POST",
          body: requestBody,
          authUserMasked: mask(keyId),
          authSecretPresent: true,
        },
        razorpayResponse: parsedBody,
      },
      { status: response.ok ? 200 : 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "network_or_runtime_exception",
        error: error instanceof Error ? error.message : String(error),
        env,
        request: {
          url: "https://api.razorpay.com/v1/orders",
          method: "POST",
          body: requestBody,
          authUserMasked: mask(keyId),
          authSecretPresent: true,
        },
      },
      { status: 500 },
    );
  }
}