import type { NextRequest } from 'next/server';

import { getSupabaseClient } from '@gozaika/db';
import { Resend } from 'resend';
import { z } from 'zod';

import { checkRateLimit } from '@/lib/ratelimit';
import { sanitize } from '@/lib/sanitize';
import { verifyTurnstile } from '@/lib/turnstile';

const waitlistSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(120),
  city: z.string().min(1).max(80),
  role: z.enum(['consumer', 'restaurant']),
  consent: z.boolean().optional(),
  cfToken: z.string().optional(),
});

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest): Promise<Response> {
  const block = await checkRateLimit(req, 'waitlist');
  if (block) return block;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Invalid form fields.' }, { status: 400 });
  }

  if (!parsed.data.cfToken) {
    return Response.json({ ok: false, error: 'Security check required.' }, { status: 400 });
  }

  const isHuman = await verifyTurnstile(parsed.data.cfToken);
  if (!isHuman) {
    return Response.json({ ok: false, error: 'Security check failed.' }, { status: 403 });
  }

  const payload = {
    full_name: sanitize(parsed.data.name, 100),
    email: sanitize(parsed.data.email.toLowerCase(), 120),
    city_name: sanitize(parsed.data.city, 80),
    role_code: parsed.data.role,
    source_code: 'website_waitlist',
  };

  try {
    const supabase = getSupabaseClient();
    const insertResult = await supabase.from('waitlist_lead').insert(payload);
    if (insertResult.error && insertResult.error.code !== '23505') {
      return Response.json({ ok: false, error: 'Unable to save waitlist entry.' }, { status: 500 });
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
      to: process.env.WAITLIST_TO_EMAIL ?? 'waitlist@gozaika.in',
      subject: `Waitlist signup: ${payload.full_name} (${payload.city_name})`,
      text: `Name: ${payload.full_name}\nEmail: ${payload.email}\nCity: ${payload.city_name}\nRole: ${payload.role_code}`,
    });
  } catch {
    return Response.json({ ok: false, error: 'Unable to send notification email.' }, { status: 500 });
  }

  return Response.json({ ok: true, message: 'Added to waitlist' });
}
