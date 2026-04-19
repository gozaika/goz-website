'use client';

import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { track } from '@/lib/analytics';
import { headerNav } from '@/lib/navigation';

import { Button } from '@/components/ui/Button';

export function Header(): React.ReactElement {
  const [isMobileOpen, setIsMobileOpen] = React.useState<boolean>(false);

  const handleToggleMobile = (): void => {
    setIsMobileOpen((previous: boolean) => !previous);
  };

  return (
    <header className="sticky top-0 z-50 bg-forest shadow-sm">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center"
          onClick={() => track.navClick('Logo', 'header')}
        >
          <Image
            src="/logos/gozaika-logo-white.svg"
            alt="goZaika logo"
            width={140}
            height={36}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {headerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white hover:text-cream focus:outline-none focus:ring-2 focus:ring-white"
              onClick={() => track.navClick(item.label, 'header')}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/#waitlist" onClick={() => track.ctaClick('Join Waitlist', 'nav')}>
            <Button size="sm">Join Waitlist</Button>
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-white md:hidden"
          aria-label="Toggle mobile navigation"
          onClick={handleToggleMobile}
        >
          {isMobileOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {isMobileOpen ? (
        <nav className="border-t border-white/20 px-4 py-4 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-3">
            {headerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block text-base font-medium text-white"
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
                className="inline-flex rounded-md bg-saffron px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray900"
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
      ) : null}
    </header>
  );
}
