'use client';

import * as React from 'react';

import { track } from '@/lib/analytics';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export function WaitlistForm(): React.ReactElement {
  const [status, setStatus] = React.useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [cfToken, setCfToken] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState<boolean>(false);
  const [name, setName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const prefetchedEmail = window.sessionStorage.getItem('gozaika_waitlist_prefill_email');

    if (prefetchedEmail) {
      window.sessionStorage.removeItem('gozaika_waitlist_prefill_email');
    }

    return prefetchedEmail ?? '';
  });
  const [city, setCity] = React.useState<string>('Hyderabad');
  const [role, setRole] = React.useState<'consumer' | 'restaurant'>('consumer');

  React.useEffect((): (() => void) => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const handlePrefill = (event: Event): void => {
      const nextEmail = (event as CustomEvent<string>).detail;

      if (typeof nextEmail === 'string' && nextEmail.length > 0) {
        setEmail(nextEmail);
      }
    };

    window.addEventListener('gozaika:prefill-waitlist-email', handlePrefill as EventListener);

    return (): void => {
      window.removeEventListener('gozaika:prefill-waitlist-email', handlePrefill as EventListener);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!consent) {
      setErrorMessage('Please provide consent to continue.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);
    track.waitlistSubmit(city, role);

    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, city, role, cfToken }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !data.ok) {
      setStatus('error');
      const message = data.error ?? 'Unable to join right now.';
      setErrorMessage(message);
      track.waitlistError('api_error');
      return;
    }

    setStatus('success');
    track.waitlistSuccess(city, role);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} aria-busy={status === 'loading'}>
      <Input
        id="waitlist-name"
        label="Name"
        required
        value={name}
        maxLength={100}
        onFocus={() => track.waitlistStart()}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        id="waitlist-email"
        type="email"
        label="Email"
        required
        value={email}
        maxLength={120}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        id="waitlist-city"
        label="City"
        required
        value={city}
        maxLength={80}
        onChange={(event) => setCity(event.target.value)}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="waitlist-role" className="mb-1 block text-sm font-medium text-gray700">
          I am joining as
        </label>
        <select
          id="waitlist-role"
          className="h-11 w-full rounded-md border border-gray200 px-4 text-base text-gray900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-saffron"
          value={role}
          onChange={(event) => {
            if (event.target.value === 'restaurant') {
              setRole('restaurant');
              return;
            }
            setRole('consumer');
          }}
        >
          <option value="consumer">Consumer</option>
          <option value="restaurant">Restaurant</option>
        </select>
      </div>
      <div className="flex items-start gap-2">
        <input
          id="waitlist-consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border border-gray200 text-saffron focus:ring-saffron"
        />
        <label htmlFor="waitlist-consent" className="text-sm leading-relaxed text-gray700">
          By joining the waitlist, you consent to receive product updates and launch
          notifications from goZaika. View our Privacy Policy.
        </label>
      </div>

      <TurnstileWidget onVerify={setCfToken} onExpire={() => setCfToken(null)} />

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={status === 'loading'}
        disabled={!consent || status === 'loading'}
      >
        Join Waitlist
      </Button>

      <p className="text-center text-xs text-gray500">
        Consent required. We only use your details for launch updates and product communication.
      </p>

      {status === 'success' ? (
        <p className="text-center text-sm text-success" role="status" aria-live="polite">
          You&apos;re on the list! We&apos;ll notify you when BAM Bags drop near you.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-center text-sm text-error" role="alert" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
