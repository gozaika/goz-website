'use client';

import * as React from 'react';

import { cn } from '@gozaika/utils';

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
  amount?: number;
  delayClass?: string;
}

export function Reveal({
  amount = 0.2,
  as = 'div',
  children,
  className,
  delayClass,
  ...props
}: RevealProps): React.ReactElement {
  const elementRef = React.useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = React.useState<boolean>(false);
  const [disableMotion, setDisableMotion] = React.useState<boolean>(false);

  React.useEffect((): (() => void) => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncPreference = (): void => {
      const nextDisableMotion = mediaQuery.matches || Boolean(window.navigator.webdriver);
      setDisableMotion(nextDisableMotion);

      if (nextDisableMotion) {
        setIsVisible(true);
      }
    };

    syncPreference();
    mediaQuery.addEventListener('change', syncPreference);

    return (): void => {
      mediaQuery.removeEventListener('change', syncPreference);
    };
  }, []);

  React.useEffect((): (() => void) => {
    if (disableMotion || elementRef.current === null) {
      return () => undefined;
    }

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]): void => {
        const entry = entries[0];

        if (!entry?.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.disconnect();
      },
      {
        threshold: amount,
      },
    );

    observer.observe(elementRef.current);

    return (): void => {
      observer.disconnect();
    };
  }, [amount, disableMotion]);

  return React.createElement(
    as,
    {
      ...props,
      ref: elementRef,
      className: cn(
        'reveal',
        !disableMotion && isVisible && 'reveal-visible',
        !disableMotion && delayClass,
        className,
      ),
    },
    children,
  );
}
