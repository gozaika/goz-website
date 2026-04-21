import type { NextRequest } from 'next/server';

import { getSupabaseClient } from '@gozaika/db';
import { Resend } from 'resend';
import { z } from 'zod';

import { checkRateLimit } from '@/lib/ratelimit';
import { sanitize } from '@/lib/sanitize';
import { shouldBypassTurnstile, verifyTurnstile } from '@/lib/turnstile';

const partnerSchema = z.object({
  restaurantName: z.string().min(1).max(120),
  ownerName: z.string().min(1).max(100),
  email: z.string().email().max(120),
  phone: z.string().min(7).max(20),
  city: z.string().min(1).max(80),
  cuisine: z.string().min(1).max(120),
  dailyCovers: z.string().min(1).max(80),
  message: z.string().max(2000).optional(),
  consent: z.boolean(),
  cfToken: z.string().nullish(),
});

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest): Promise<Response> {
  const block = await checkRateLimit(req, 'partner-interest');
  if (block) return block;
  const shouldVerifyTurnstile = !shouldBypassTurnstile(req.nextUrl.hostname);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Invalid form fields.' }, { status: 400 });
  }

  if (!parsed.data.consent) {
    return Response.json({ ok: false, error: 'Consent is required.' }, { status: 400 });
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

  const payload = {
    restaurant_name: sanitize(parsed.data.restaurantName, 120),
    owner_name: sanitize(parsed.data.ownerName, 100),
    email: sanitize(parsed.data.email.toLowerCase(), 120),
    phone_number: sanitize(parsed.data.phone, 20),
    city_name: sanitize(parsed.data.city, 80),
    cuisine_name: sanitize(parsed.data.cuisine, 120),
    daily_covers: sanitize(parsed.data.dailyCovers, 80),
    message: sanitize(parsed.data.message ?? '', 2000),
  };

  try {
    const supabase = getSupabaseClient();
    const insertResult = await supabase.from('partner_interest').insert(payload);
    if (insertResult.error) {
      return Response.json({ ok: false, error: 'Unable to save partner submission.' }, { status: 500 });
    }
  } catch {
    return Response.json({ ok: false, error: 'Database configuration missing.' }, { status: 500 });
  }

  const resend = getResendClient();
  if (!resend) {
    return Response.json({ ok: false, error: 'Email configuration missing.' }, { status: 500 });
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'goZaika <onboarding@resend.dev>',
      to: process.env.PARTNERS_TO_EMAIL ?? 'partners@gozaika.in',
      subject: `Partner interest: ${payload.restaurant_name}`,
      text: `Restaurant: ${payload.restaurant_name}\nOwner: ${payload.owner_name}\nEmail: ${payload.email}\nPhone: ${payload.phone_number}\nCity: ${payload.city_name}\nCuisine: ${payload.cuisine_name}\nDaily covers: ${payload.daily_covers}\nMessage: ${payload.message}`,
    });
  } catch {
    return Response.json({ ok: false, error: 'Unable to send notification email.' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
