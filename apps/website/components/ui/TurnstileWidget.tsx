'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

import { shouldBypassTurnstile } from '@/lib/turnstile';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export interface TurnstileWidgetHandle {
  getToken: () => Promise<string | null>;
  reset: () => void;
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

export const TurnstileWidget = React.forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget(
    { onError, onExpire, onVerify }: TurnstileWidgetProps,
    ref,
  ): React.ReactElement | null {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const turnstileRef = React.useRef<TurnstileInstance>(null);
    const isHydrated = React.useSyncExternalStore(
      () => () => undefined,
      () => true,
      () => false,
    );
    const shouldRenderWidget =
      isHydrated && Boolean(siteKey) && !shouldBypassTurnstile(window.location.hostname);

    React.useImperativeHandle(
      ref,
      () => ({
        getToken: async (): Promise<string | null> => {
          if (!siteKey || !shouldRenderWidget) {
            return null;
          }

          const existingToken = turnstileRef.current?.getResponse();
          const isExpired = turnstileRef.current?.isExpired() ?? false;

          if (existingToken && !isExpired) {
            return existingToken;
          }

          if (isExpired) {
            turnstileRef.current?.reset();
          }

          turnstileRef.current?.execute();

          try {
            return (await turnstileRef.current?.getResponsePromise()) ?? null;
          } catch {
            return null;
          }
        },
        reset: (): void => {
          turnstileRef.current?.reset();
        },
      }),
      [siteKey, shouldRenderWidget],
    );

    if (!siteKey) {
      return null;
    }

    return (
      <div suppressHydrationWarning>
        {shouldRenderWidget ? (
          <Turnstile
            ref={turnstileRef}
            siteKey={siteKey}
            onSuccess={onVerify}
            onExpire={onExpire}
            onError={() => {
              onError?.();
            }}
            options={{ theme: 'light', size: 'invisible', execution: 'execute' }}
          />
        ) : null}
      </div>
    );
  },
);
