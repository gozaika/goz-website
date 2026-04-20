'use client';

import * as React from 'react';

import { careerRoleOptions } from '@/lib/company';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export function CareerApplicationForm(): React.ReactElement {
  const [status, setStatus] = React.useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [cfToken, setCfToken] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState<boolean>(false);

  const [name, setName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [roleInterest, setRoleInterest] = React.useState<string>(careerRoleOptions[0]);
  const [linkedIn, setLinkedIn] = React.useState<string>('');
  const [location, setLocation] = React.useState<string>('Hyderabad');
  const [portfolioUrl, setPortfolioUrl] = React.useState<string>('');
  const [motivation, setMotivation] = React.useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    const response = await fetch('/api/careers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        roleInterest,
        linkedIn,
        location,
        portfolioUrl,
        motivation,
        consent,
        cfToken,
      }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !data.ok) {
      setStatus('error');
      setErrorMessage(data.error ?? 'Unable to submit your application right now.');
      return;
    }

    setStatus('success');
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} aria-busy={status === 'loading'}>
      <Input
        id="career-name"
        label="Name"
        required
        value={name}
        maxLength={100}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        id="career-email"
        type="email"
        label="Email"
        required
        value={email}
        maxLength={120}
        onChange={(event) => setEmail(event.target.value)}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="career-role-interest" className="mb-1 block text-sm font-medium text-gray700">
          Role interest
        </label>
        <select
          id="career-role-interest"
          className="h-11 w-full rounded-md border border-gray200 px-4 text-base text-gray900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-saffron"
          value={roleInterest}
          onChange={(event) => setRoleInterest(event.target.value)}
        >
          {careerRoleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <Input
        id="career-linkedin"
        type="url"
        label="LinkedIn"
        value={linkedIn}
        maxLength={250}
        onChange={(event) => setLinkedIn(event.target.value)}
      />
      <Input
        id="career-location"
        label="Location"
        required
        value={location}
        maxLength={120}
        onChange={(event) => setLocation(event.target.value)}
      />
      <Input
        id="career-portfolio"
        type="url"
        label="Portfolio or resume URL"
        value={portfolioUrl}
        maxLength={250}
        onChange={(event) => setPortfolioUrl(event.target.value)}
      />
      <Textarea
        id="career-motivation"
        label="Why this problem matters to you"
        required
        helper="Tell us what you want to build with us and why now is the right moment."
        maxLength={2000}
        value={motivation}
        onChange={(event) => setMotivation(event.target.value)}
      />

      <div className="flex items-start gap-2">
        <input
          id="career-consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border border-gray200 text-saffron focus:ring-saffron"
        />
        <label htmlFor="career-consent" className="text-sm leading-relaxed text-gray700">
          I consent to goZaika storing and reviewing my application data for hiring-related
          communication.
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
        Apply
      </Button>

      <p className="text-center text-xs text-gray500">
        We read every application carefully and will follow up if there is a fit.
      </p>

      {status === 'success' ? (
        <p className="text-center text-sm text-success" role="status" aria-live="polite">
          Application received. We will review it and be in touch if there is a match.
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
