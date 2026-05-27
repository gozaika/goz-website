/**
 * @file apps/website/components/forms/InsiderForm.tsx
 * @description WhatsApp Insider sign-up form.
 * Collects name, phone number, and Hyderabad area.
 * Posts to /api/insider/subscribe.
 */

'use client';

import * as React from 'react';

import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from '@/components/ui/TurnstileWidget';
import { trackEvent } from '@/lib/analytics';
import { shouldBypassTurnstile } from '@/lib/turnstile';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

const HYDERABAD_AREAS = [
  'Banjara Hills',
  'Jubilee Hills',
  'HITEC City',
  'Kondapur',
  'Madhapur',
  'Gachibowli',
  'Begumpet',
  'Somajiguda',
  'Ameerpet',
  'Secunderabad',
  'Other area',
] as const;

export function InsiderForm(): React.ReactElement {
  const [status, setStatus] = React.useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [cfToken, setCfToken] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [area, setArea] = React.useState('');
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null);
  const bypassTurnstile =
    typeof window !== 'undefined' && shouldBypassTurnstile(window.location.hostname);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (!bypassTurnstile && !cfToken) {
      setErrorMessage('Please complete the security check.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/insider/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, area, cfToken }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string; message?: string };

      if (!res.ok || !json.ok) {
        setErrorMessage(json.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
        turnstileRef.current?.reset();
        return;
      }

      setStatus('success');
      trackEvent('insider_subscribe', { area });
    } catch {
      setErrorMessage('Could not connect. Please check your connection and try again.');
      setStatus('error');
      turnstileRef.current?.reset();
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-[#25D366]/10 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white">
          <MessageCircle className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold text-gray900">You&apos;re on the Insider list.</h3>
        <p className="mt-2 text-base text-gray700">
          We&apos;ll send you a WhatsApp message to confirm your spot before launch. Look out for a
          message from <strong>goZaika</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="insider-name" className="mb-1.5 block text-sm font-medium text-gray900">
          Your name
        </label>
        <Input
          id="insider-name"
          label="Your name"
          type="text"
          autoComplete="name"
          placeholder="e.g. Rahul Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={100}
          disabled={status === 'loading'}
        />
      </div>

      <div>
        <label htmlFor="insider-phone" className="mb-1.5 block text-sm font-medium text-gray900">
          WhatsApp number
        </label>
        <Input
          id="insider-phone"
          label="WhatsApp number"
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          minLength={10}
          maxLength={15}
          disabled={status === 'loading'}
        />
        <p className="mt-1 text-xs text-gray500">
          Used only for goZaika drop alerts. No marketing spam, ever.
        </p>
      </div>

      <div>
        <label htmlFor="insider-area" className="mb-1.5 block text-sm font-medium text-gray900">
          Your area in Hyderabad
        </label>
        <select
          id="insider-area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          required
          disabled={status === 'loading'}
          className="w-full rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-4 py-3 text-sm text-gray900 outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select your area…</option>
          {HYDERABAD_AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray500">
          We&apos;ll alert you when drops go live near you.
        </p>
      </div>

      {!bypassTurnstile && (
        <TurnstileWidget ref={turnstileRef} onVerify={setCfToken} />
      )}

      {status === 'error' && errorMessage && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-[#25D366] text-white hover:bg-[#1ebe59]"
      >
        {status === 'loading' ? (
          'Joining…'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Join the Insider List
          </span>
        )}
      </Button>
    </form>
  );
}
