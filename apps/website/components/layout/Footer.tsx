import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

import { footerColumns } from '@/lib/navigation';

export function Footer(): React.ReactElement {
  return (
    <footer className="mt-auto border-t border-[var(--color-forest-border)] bg-forest text-white">
      <div className="mx-auto max-w-screen-xl px-4 py-12 md:px-6 lg:px-8">
        <div>
          <Image
            src="/logos/gozaika-logo-white.svg"
            alt="goZaika logo"
            width={160}
            height={40}
          />
        </div>

        <div className="mb-8 mt-8 flex gap-4">
          <FooterSocialLink href="#" label="LinkedIn">
            <LinkedInIcon />
          </FooterSocialLink>
          <FooterSocialLink href="#" label="Instagram">
            <InstagramIcon />
          </FooterSocialLink>
          <FooterSocialLink href="#" label="WhatsApp">
            <MessageCircle className="h-5 w-5" />
          </FooterSocialLink>
        </div>

        <div className="grid gap-10 md:grid-cols-4">
          <FooterColumn heading="Discover" links={footerColumns.discover} />
          <FooterColumn heading="Partners" links={footerColumns.partners} />
          <FooterColumn heading="Company" links={footerColumns.company} />
          <FooterColumn heading="Legal" links={footerColumns.legal} />
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-4 border-t border-[var(--color-forest-border)] pt-6 text-sm text-forest-light/80">
          <p>© 2025 GoZaika Technologies Pvt. Ltd.</p>
          <p>Made with care in Hyderabad</p>
        </div>
      </div>
    </footer>
  );
}

interface FooterColumnProps {
  heading: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}

function FooterColumn({ heading, links }: FooterColumnProps): React.ReactElement {
  return (
    <div>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-forest-light">
        {heading}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={`${heading}-${link.label}`}>
            {link.href === '#' ? (
              <span className="text-sm text-forest-light" aria-label="Coming soon">
                {link.label}
              </span>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-forest-light/75 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface FooterSocialLinkProps {
  href: string;
  label: string;
  children: React.ReactNode;
}

function FooterSocialLink({
  children,
  href,
  label,
}: FooterSocialLinkProps): React.ReactElement {
  return (
    <Link
      href={href}
      aria-label={label}
      className="text-forest-light/75 transition-colors hover:text-white"
    >
      {children}
    </Link>
  );
}

function LinkedInIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" rx="1" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
