'use client';

import * as React from 'react';

interface AnimatedNumberProps {
  value: string;
  className?: string;
}

export function AnimatedNumber({
  className,
  value,
}: AnimatedNumberProps): React.ReactElement {
  const containerRef = React.useRef<HTMLParagraphElement | null>(null);
  const [displayValue, setDisplayValue] = React.useState<string>(value);

  React.useEffect((): (() => void) => {
    const targetNumber = Number.parseInt(value, 10);

    if (Number.isNaN(targetNumber) || containerRef.current === null) {
      return () => undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (mediaQuery.matches) {
      return () => undefined;
    }

    let animationFrame = 0;
    let hasAnimated = false;

    const suffix = value.replace(String(targetNumber), '');
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const entry = entries[0];

        if (!entry?.isIntersecting || hasAnimated) {
          return;
        }

        hasAnimated = true;
        const startedAt = performance.now();
        const duration = 900;

        const tick = (now: number): void => {
          const elapsed = now - startedAt;
          const progress = Math.min(1, elapsed / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(targetNumber * eased);

          setDisplayValue(`${current}${suffix}`);

          if (progress < 1) {
            animationFrame = window.requestAnimationFrame(tick);
          }
        };

        animationFrame = window.requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );

    observer.observe(containerRef.current);

    return (): void => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  return (
    <p ref={containerRef} className={className}>
      {displayValue}
    </p>
  );
}
