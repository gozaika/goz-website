'use client';

import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import { cn } from '@gozaika/utils';

import { track } from '@/lib/analytics';
import { headerNav } from '@/lib/navigation';

export function Header(): React.ReactElement {
  const [isMobileOpen, setIsMobileOpen] = React.useState<boolean>(false);
  const [isScrolled, setIsScrolled] = React.useState<boolean>(false);
  const pathname = usePathname();

  React.useEffect((): (() => void) => {
    const handleScroll = (): void => {
      setIsScrolled(window.scrollY > 100);
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
        'sticky top-0 z-50 border-b transition-all duration-300',
        isScrolled
          ? 'border-[var(--color-header-glass-border)] bg-[var(--color-header-glass)]/80 shadow-[0_10px_30px_rgba(26,92,56,0.1)] backdrop-blur-xl'
          : 'border-transparent bg-forest shadow-sm',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-screen-xl items-center justify-between px-4 transition-[padding] duration-300 md:px-6 lg:px-8',
          isScrolled ? 'py-3' : 'py-4',
        )}
      >
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
              className={cn(
                'rounded-full px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2',
                isScrolled
                  ? 'focus:ring-forest'
                  : 'focus:ring-white',
                pathname === item.href
                  ? isScrolled
                    ? 'bg-white/80 text-forest'
                    : 'bg-white/10 text-white'
                  : isScrolled
                    ? 'text-gray700 hover:bg-white/60 hover:text-forest'
                    : 'text-forest-light hover:text-white',
              )}
              onClick={() => track.navClick(item.label, 'header')}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/#waitlist"
            className="rounded-md bg-saffron px-5 py-2 text-sm font-semibold text-gray900 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-saffron-hover)]"
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
          'overflow-hidden transition-[max-height,opacity,background-color] duration-300 lg:hidden',
          isScrolled ? 'bg-[var(--color-header-glass)]/95 backdrop-blur-xl' : 'bg-forest',
          isMobileOpen ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <nav
          className={cn(
            'px-4',
            isScrolled ? 'border-t border-[var(--color-header-glass-border)]' : 'border-t border-white/20',
          )}
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-3">
            {headerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'block rounded-xl px-3 py-4 text-base font-medium transition-colors',
                    pathname === item.href
                      ? isScrolled
                        ? 'bg-white/80 text-forest'
                        : 'bg-white/10 text-white'
                      : isScrolled
                        ? 'text-gray700 hover:bg-white/60 hover:text-forest'
                        : 'text-forest-light hover:text-white',
                  )}
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
                className="mb-4 inline-flex rounded-md bg-saffron px-5 py-2 text-sm font-semibold text-gray900 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-saffron-hover)]"
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
