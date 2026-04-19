import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { footerColumns } from '@/lib/navigation';

export function Footer(): React.ReactElement {
  return (
    <footer className="mt-auto bg-forest text-white">
      <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-12 md:grid-cols-4 md:px-6 lg:px-8">
        <div className="md:col-span-4">
          <Image
            src="/logos/gozaika-logo-white.svg"
            alt="goZaika logo"
            width={160}
            height={40}
          />
        </div>
        <FooterColumn heading="Discover" links={footerColumns.discover} />
        <FooterColumn heading="Partners" links={footerColumns.partners} />
        <FooterColumn heading="Company" links={footerColumns.company} />
        <FooterColumn heading="Legal" links={footerColumns.legal} />
      </div>
      <div className="border-t border-white/20 px-4 py-4 text-center text-sm text-white/80">
        © 2025 GoZaika Technologies Pvt. Ltd. · Made with care in Hyderabad
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
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/90">
        {heading}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={`${heading}-${link.label}`}>
            {link.href === '#' ? (
              <span className="text-sm text-white/70" aria-label="Coming soon">
                {link.label}
              </span>
            ) : (
              <Link href={link.href} className="text-sm text-white/90 hover:text-cream">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
