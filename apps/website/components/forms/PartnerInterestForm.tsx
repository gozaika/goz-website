'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export function PartnerInterestForm(): React.ReactElement {
  const [status, setStatus] = React.useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [cfToken, setCfToken] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState<boolean>(false);

  const [restaurantName, setRestaurantName] = React.useState<string>('');
  const [ownerName, setOwnerName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [phone, setPhone] = React.useState<string>('');
  const [city, setCity] = React.useState<string>('Hyderabad');
  const [cuisine, setCuisine] = React.useState<string>('');
  const [dailyCovers, setDailyCovers] = React.useState<string>('');
  const [message, setMessage] = React.useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    const response = await fetch('/api/partner-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantName,
        ownerName,
        email,
        phone,
        city,
        cuisine,
        dailyCovers,
        message,
        consent,
        cfToken,
      }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !data.ok) {
      setStatus('error');
      setErrorMessage(data.error ?? 'Unable to submit right now.');
      return;
    }

    setStatus('success');
  };

  return (
    <form id="partner-form" className="space-y-5" onSubmit={handleSubmit}>
      <Input
        id="partner-restaurant-name"
        label="Restaurant name"
        required
        maxLength={120}
        value={restaurantName}
        onChange={(event) => setRestaurantName(event.target.value)}
      />
      <Input
        id="partner-owner-name"
        label="Owner or manager name"
        required
        maxLength={100}
        value={ownerName}
        onChange={(event) => setOwnerName(event.target.value)}
      />
      <Input
        id="partner-email"
        type="email"
        label="Email"
        required
        maxLength={120}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        id="partner-phone"
        type="tel"
        label="Phone"
        required
        maxLength={20}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />
      <Input
        id="partner-city"
        label="City"
        required
        maxLength={80}
        value={city}
        onChange={(event) => setCity(event.target.value)}
      />
      <Input
        id="partner-cuisine"
        label="Cuisine type"
        required
        maxLength={120}
        value={cuisine}
        onChange={(event) => setCuisine(event.target.value)}
      />
      <Input
        id="partner-daily-covers"
        label="Estimated daily covers"
        required
        maxLength={80}
        value={dailyCovers}
        onChange={(event) => setDailyCovers(event.target.value)}
      />
      <Textarea
        id="partner-message"
        label="Message"
        helper="Optional details about your outlet footprint and launch timeline."
        maxLength={2000}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <div className="flex items-start gap-2">
        <input
          id="partner-consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border border-gray200 text-saffron focus:ring-saffron"
        />
        <label htmlFor="partner-consent" className="text-sm leading-relaxed text-gray700">
          By submitting this form, GoZaika Technologies Pvt. Ltd. may contact you
          regarding a potential partnership.
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
        Express Partner Interest
      </Button>
      <p className="text-center text-xs text-gray500">
        We only use this information to evaluate partnership fit and follow up with you.
      </p>
      {status === 'success' ? (
        <p className="text-center text-sm text-success" role="status" aria-live="polite">
          Thanks for sharing your details. Our team will reach out within 48 hours.
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
