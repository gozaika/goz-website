/**
 * @file apps/website/app/api/insider/subscribe/route.ts
 * @description WhatsApp Insider sign-up endpoint.
 * Inserts into marketing_waitlist_lead with source_code = WHATSAPP_INSIDER.
 * Phone number is captured for future WhatsApp opt-in flow.
 */

import type { NextRequest } from 'next/server';

import { getSupabaseClient } from '@gozaika/db';
import { z } from 'zod';

import { checkRateLimit } from '@/lib/ratelimit';
import { sanitize } from '@/lib/sanitize';
import { shouldBypassTurnstile, verifyTurnstile } from '@/lib/turnstile';

const insiderSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number'),
  area: z.string().min(1).max(80),
  cfToken: z.string().nullish(),
});

export async function POST(req: NextRequest): Promise<Response> {
  const block = await checkRateLimit(req, 'insider');
  if (block) return block;

  const shouldVerifyTurnstile = !shouldBypassTurnstile(req.nextUrl.hostname);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = insiderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Invalid form fields.' }, { status: 400 });
  }

  if (shouldVerifyTurnstile && !parsed.data.cfToken) {
    return Response.json({ ok: false, error: 'Security check required.' }, { status: 400 });
  }

  if (shouldVerifyTurnstile) {
    const isHuman = await verifyTurnstile(parsed.data.cfToken!);
    if (!isHuman) {
      return Response.json({ ok: false, error: 'Security check failed.' }, { status: 403 });
    }
  }

  // Normalise phone: strip spaces and ensure +91 prefix for Indian numbers
  const rawPhone = parsed.data.phone.replace(/[\s\-()]/g, '');
  const phone =
    rawPhone.startsWith('+') ? rawPhone : rawPhone.startsWith('91') ? `+${rawPhone}` : `+91${rawPhone}`;

  const payload = {
    full_name: sanitize(parsed.data.name, 100),
    phone_e164: phone,
    city_name: 'Hyderabad',
    area_text: sanitize(parsed.data.area, 80),
    source_code: 'WHATSAPP_INSIDER',
    role_code: 'consumer',
  };

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('marketing_waitlist_lead').insert(payload);
    if (error && error.code !== '23505') {
      console.error('[insider/subscribe] db insert error', error);
      return Response.json({ ok: false, error: 'Unable to save your details.' }, { status: 500 });
    }
    // 23505 = unique_violation (phone already registered) — treat as success
  } catch (err) {
    console.error('[insider/subscribe] unexpected error', err);
    return Response.json({ ok: false, error: 'Service unavailable.' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    message: "You're on the Insider list. We'll send you a WhatsApp confirmation shortly.",
  });
}
