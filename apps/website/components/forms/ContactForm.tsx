'use client';

import * as React from 'react';

import { contactSubjects } from '@/lib/content';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';

type ContactSubject = (typeof contactSubjects)[number]['value'];
type FormStatus = 'idle' | 'loading' | 'success' | 'error';

function isContactSubject(value: string): value is ContactSubject {
  return contactSubjects.some((subject) => subject.value === value);
}

export function ContactForm(): React.ReactElement {
  const [status, setStatus] = React.useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [cfToken, setCfToken] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState<boolean>(false);
  const [name, setName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [subject, setSubject] = React.useState<ContactSubject>('general');
  const [message, setMessage] = React.useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message, consent, cfToken }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !data.ok) {
      setStatus('error');
      setErrorMessage(data.error ?? 'Unable to send your message right now.');
      return;
    }

    setStatus('success');
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} aria-busy={status === 'loading'}>
      <Input
        id="contact-name"
        label="Name"
        required
        value={name}
        maxLength={100}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        id="contact-email"
        type="email"
        label="Email"
        required
        value={email}
        maxLength={120}
        onChange={(event) => setEmail(event.target.value)}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium text-gray700">
          Subject
        </label>
        <select
          id="contact-subject"
          className="h-11 w-full rounded-md border border-gray200 px-4 text-base text-gray900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-saffron"
          value={subject}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (isContactSubject(nextValue)) {
              setSubject(nextValue);
            }
          }}
        >
          {contactSubjects.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <Textarea
        id="contact-message"
        label="Message"
        required
        maxLength={2000}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <div className="flex items-start gap-2">
        <input
          id="contact-consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border border-gray200 text-saffron focus:ring-saffron"
        />
        <label htmlFor="contact-consent" className="text-sm leading-relaxed text-gray700">
          By submitting this form, you consent to GoZaika Technologies Pvt. Ltd.
          storing and processing your information to respond to your enquiry.
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
        Send Message
      </Button>

      <p className="text-center text-xs text-gray500">
        By submitting this form, you consent to GoZaika Technologies Pvt. Ltd.
        storing and processing your information to respond to your enquiry.
      </p>

      {status === 'success' ? (
        <p className="text-center text-sm text-success" role="status" aria-live="polite">
          Message sent. We usually respond within 24 hours.
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
