'use client';

import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

import { cn } from '@gozaika/utils';

import { track } from '@/lib/analytics';
import { headerNav } from '@/lib/navigation';

export function Header(): React.ReactElement {
  const [isMobileOpen, setIsMobileOpen] = React.useState<boolean>(false);
  const [hasScrollShadow, setHasScrollShadow] = React.useState<boolean>(false);

  React.useEffect((): (() => void) => {
    const handleScroll = (): void => {
      setHasScrollShadow(window.scrollY > 100);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return (): void => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleToggleMobile = (): void => {
    setIsMobileOpen((previous: boolean) => !previous);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-forest shadow-sm transition-shadow',
        hasScrollShadow ? 'shadow-md' : 'shadow-sm',
      )}
    >
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center"
          onClick={() => {
            setIsMobileOpen(false);
            track.navClick('Logo', 'header');
          }}
        >
          <Image
            src="/logos/gozaika-logo-white.svg"
            alt="goZaika logo"
            width={140}
            height={36}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {headerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-forest-light transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
              onClick={() => track.navClick(item.label, 'header')}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/#waitlist"
            className="rounded-md bg-saffron px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-saffron-hover)]"
            onClick={() => track.ctaClick('Join Waitlist', 'nav')}
          >
            Join Waitlist
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-white lg:hidden"
          aria-label="Toggle mobile navigation"
          aria-expanded={isMobileOpen}
          onClick={handleToggleMobile}
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={cn(
          'overflow-hidden bg-forest transition-[max-height,opacity] duration-300 lg:hidden',
          isMobileOpen ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <nav className="border-t border-white/20 px-4" aria-label="Mobile">
          <ul className="flex flex-col gap-3">
            {headerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-4 text-base font-medium text-forest-light transition-colors hover:text-white"
                  onClick={() => {
                    track.navClick(item.label, 'mobile_drawer');
                    setIsMobileOpen(false);
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/#waitlist"
                className="mb-4 inline-flex rounded-md bg-saffron px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-saffron-hover)]"
                onClick={() => {
                  track.ctaClick('Join Waitlist', 'nav');
                  setIsMobileOpen(false);
                }}
              >
                Join Waitlist
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
