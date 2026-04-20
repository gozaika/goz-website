import type { NextRequest } from 'next/server';

import { getSupabaseClient } from '@gozaika/db';
import { Resend } from 'resend';
import { z } from 'zod';

import { checkRateLimit } from '@/lib/ratelimit';
import { sanitize } from '@/lib/sanitize';
import { verifyTurnstile } from '@/lib/turnstile';

const careerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(120),
  roleInterest: z.string().min(1).max(120),
  linkedIn: z.string().url().max(250).optional().or(z.literal('')),
  location: z.string().min(1).max(120),
  portfolioUrl: z.string().url().max(250).optional().or(z.literal('')),
  motivation: z.string().min(30).max(2000),
  consent: z.boolean(),
  cfToken: z.string().optional(),
});

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest): Promise<Response> {
  const block = await checkRateLimit(req, 'careers');
  if (block) return block;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = careerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Invalid form fields.' }, { status: 400 });
  }

  if (!parsed.data.consent) {
    return Response.json({ ok: false, error: 'Consent is required.' }, { status: 400 });
  }

  if (!parsed.data.cfToken) {
    return Response.json({ ok: false, error: 'Security check required.' }, { status: 400 });
  }

  const isHuman = await verifyTurnstile(parsed.data.cfToken);
  if (!isHuman) {
    return Response.json({ ok: false, error: 'Security check failed.' }, { status: 403 });
  }

  const payload = {
    applicant_name: sanitize(parsed.data.name, 100),
    email: sanitize(parsed.data.email.toLowerCase(), 120),
    role_interest: sanitize(parsed.data.roleInterest, 120),
    linkedin_url: sanitize(parsed.data.linkedIn ?? '', 250),
    location_name: sanitize(parsed.data.location, 120),
    portfolio_url: sanitize(parsed.data.portfolioUrl ?? '', 250),
    motivation: sanitize(parsed.data.motivation, 2000),
  };

  try {
    const supabase = getSupabaseClient();
    const insertResult = await supabase.from('career_application').insert(payload);
    if (insertResult.error) {
      return Response.json(
        { ok: false, error: 'Unable to save career application.' },
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
      to: process.env.CAREERS_TO_EMAIL ?? 'careers@gozaika.in',
      subject: `Career application: ${payload.role_interest}`,
      text:
        `Name: ${payload.applicant_name}\n` +
        `Email: ${payload.email}\n` +
        `Role interest: ${payload.role_interest}\n` +
        `Location: ${payload.location_name}\n` +
        `LinkedIn: ${payload.linkedin_url}\n` +
        `Portfolio: ${payload.portfolio_url}\n\n` +
        `${payload.motivation}`,
    });
  } catch {
    return Response.json({ ok: false, error: 'Unable to send notification email.' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
