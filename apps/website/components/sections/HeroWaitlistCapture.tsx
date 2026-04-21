'use client';

import * as React from 'react';

export function HeroWaitlistCapture(): React.ReactElement {
  const [email, setEmail] = React.useState<string>('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('gozaika:prefill-waitlist-email', { detail: email }));
    window.location.hash = 'waitlist';
  };

  return (
    <form className="mt-8 flex flex-col gap-3 lg:flex-row" onSubmit={handleSubmit}>
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email"
        className="h-12 w-full rounded-md border border-gray200 bg-white px-4 text-base text-gray900 placeholder:text-gray600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-saffron lg:flex-1"
      />
      <button
        type="submit"
        className="h-12 rounded-md bg-forest px-8 text-sm font-semibold text-white transition-colors hover:bg-forest/95 lg:shrink-0"
      >
        Join Waitlist
      </button>
    </form>
  );
}
