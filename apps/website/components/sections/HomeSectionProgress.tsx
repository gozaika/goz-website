'use client';

import * as React from 'react';

import Link from 'next/link';

import { cn } from '@gozaika/utils';

interface HomeSectionProgressProps {
  className?: string;
}

const SECTION_LINKS = [
  { id: 'hero', label: 'Hero' },
  { id: 'steps', label: 'Flow' },
  { id: 'partners', label: 'Partners' },
  { id: 'stories', label: 'Stories' },
  { id: 'waitlist', label: 'Waitlist' },
] as const;

export function HomeSectionProgress({ className }: HomeSectionProgressProps): React.ReactElement {
  const [activeId, setActiveId] = React.useState<string>('hero');

  React.useEffect((): (() => void) => {
    const sectionElements: HTMLElement[] = SECTION_LINKS.map(
      (section): HTMLElement | null => document.getElementById(section.id),
    ).filter((section): section is HTMLElement => section !== null);

    if (sectionElements.length === 0) {
      return () => undefined;
    }

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]): void => {
        const visibleEntry = entries.find((entry: IntersectionObserverEntry): boolean => entry.isIntersecting);

        if (visibleEntry?.target instanceof HTMLElement) {
          setActiveId(visibleEntry.target.id);
        }
      },
      {
        root: null,
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0.01,
      },
    );

    sectionElements.forEach((element: HTMLElement): void => {
      observer.observe(element);
    });

    return (): void => {
      observer.disconnect();
    };
  }, []);

  return (
    <aside
      aria-label="Section progress"
      className={cn(
        'fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 xl:block',
        className,
      )}
    >
      <ol className="space-y-3 rounded-2xl border border-forest/15 bg-white/85 px-3 py-4 shadow-lg backdrop-blur-sm">
        {SECTION_LINKS.map((section) => {
          const isActive = section.id === activeId;

          return (
            <li key={section.id}>
              <Link
                href={`#${section.id}`}
                aria-label={`Jump to ${section.label} section`}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                  isActive ? 'bg-saffronLight' : 'hover:bg-cream',
                )}
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full border border-forest/30 transition-all',
                    isActive ? 'scale-110 bg-saffron' : 'bg-white group-hover:bg-forest/20',
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    isActive ? 'text-forest' : 'text-gray500',
                  )}
                >
                  {section.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
