import type { NextRequest } from 'next/server';

import { getSupabaseClient } from '@gozaika/db';
import { Resend } from 'resend';
import { z } from 'zod';

import { checkRateLimit } from '@/lib/ratelimit';
import { sanitize } from '@/lib/sanitize';
import { shouldBypassTurnstile, verifyTurnstile } from '@/lib/turnstile';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(120),
  subject: z.enum(['general', 'restaurant', 'investor', 'press', 'careers']),
  message: z.string().min(10).max(2000),
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
  const block = await checkRateLimit(req, 'contact');
  if (block) return block;
  const shouldVerifyTurnstile = !shouldBypassTurnstile(req.nextUrl.hostname);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
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
    full_name: sanitize(parsed.data.name, 100),
    email: sanitize(parsed.data.email.toLowerCase(), 120),
    subject_code: parsed.data.subject,
    message: sanitize(parsed.data.message, 2000),
  };

  try {
    const supabase = getSupabaseClient();
    const insertResult = await supabase.from('contact_submission').insert(payload);
    if (insertResult.error) {
      return Response.json(
        { ok: false, error: 'Unable to save contact submission.' },
        { status: 500 },
      );
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
      to: process.env.CONTACT_TO_EMAIL ?? 'hello@gozaika.in',
      subject: `Contact form: ${payload.subject_code}`,
      text: `Name: ${payload.full_name}\nEmail: ${payload.email}\nSubject: ${payload.subject_code}\n\n${payload.message}`,
    });
  } catch {
    return Response.json({ ok: false, error: 'Unable to send notification email.' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
