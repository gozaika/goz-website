'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const Turnstile = dynamic(
  () =>
    import('@marsidev/react-turnstile').then(
      (module) => module.Turnstile,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

export function TurnstileWidget({
  onExpire,
  onVerify,
}: TurnstileWidgetProps): React.ReactElement | null {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return null;
  }

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onVerify}
      onExpire={onExpire}
      options={{ theme: 'light', size: 'invisible' }}
    />
  );
}
