/**
 * @file apps/website/lib/navigation.ts
 * @description Canonical route and navigation definitions for website phase.
 */

import type { SiteRoute } from '@gozaika/types';

export const siteRoutes: ReadonlyArray<SiteRoute> = [
  {
    href: '/',
    label: 'Home',
    title: 'goZaika — Discover. Pickup. Devour.',
    description:
      'Discover chef-curated BAM Bags from top restaurants near you. Buy, pickup, and devour.',
    indexable: true,
  },
  {
    href: '/how-it-works',
    label: 'How It Works',
    title: 'How a BAM Bag Works | goZaika',
    description:
      'Browse mystery drops, pay once, and pickup at the restaurant with trust-first details.',
    indexable: true,
  },
  {
    href: '/for-restaurants',
    label: 'For Restaurants',
    title: 'Partner With goZaika | For Restaurants',
    description:
      'A controlled-access discovery platform for partners that want margin without brand dilution.',
    indexable: true,
  },
  {
    href: '/about',
    label: 'About',
    title: 'About goZaika',
    description: 'Our mission, values, and intentional city-first launch approach.',
    indexable: true,
  },
  {
    href: '/faq',
    label: 'FAQ',
    title: 'Frequently Asked Questions | goZaika',
    description:
      'Answers on BAM Bags, pickup, allergens, refunds, and restaurant partnerships.',
    indexable: true,
  },
  {
    href: '/contact',
    label: 'Contact',
    title: 'Contact goZaika',
    description: 'Reach the goZaika team for customer, partner, press, or investor queries.',
    indexable: true,
  },
  {
    href: '/blog',
    label: 'Blog',
    title: 'goZaika Journal',
    description:
      'Market intelligence, restaurant economics, and strategy essays from the goZaika team.',
    indexable: true,
  },
  {
    href: '/partner-portal',
    label: 'Partner Portal',
    title: 'Partner Portal | goZaika',
    description:
      'Partnership opportunities for hospitality groups, ecosystem collaborators, and strategic allies.',
    indexable: true,
  },
  {
    href: '/cities',
    label: 'Cities',
    title: 'Cities | goZaika',
    description:
      'The goZaika launch map and market-expansion thesis across India.',
    indexable: true,
  },
  {
    href: '/company',
    label: 'Company',
    title: 'Company | goZaika',
    description:
      'Leadership, culture, careers, and investor context for goZaika.',
    indexable: true,
  },
];

export const legalRoutes: ReadonlyArray<SiteRoute> = [
  {
    href: '/privacy-policy',
    label: 'Privacy Policy',
    title: 'Privacy Policy | goZaika',
    description: 'How goZaika processes and protects personal data under DPDP 2023.',
    indexable: true,
  },
  {
    href: '/terms-of-service',
    label: 'Terms of Service',
    title: 'Terms of Service | goZaika',
    description: 'Platform usage terms for goZaika website and partner listings.',
    indexable: true,
  },
  {
    href: '/refund-policy',
    label: 'Refund Policy',
    title: 'Cancellation & Refund Policy | goZaika',
    description: 'Eligibility, exclusions, and process for BAM Bag refunds.',
    indexable: true,
  },
  {
    href: '/food-safety-policy',
    label: 'Food Safety',
    title: 'Food Safety Policy | goZaika',
    description:
      'Safety standards, allergen disclosure commitment, and reporting process.',
    indexable: true,
  },
  {
    href: '/grievance-redressal',
    label: 'Grievance',
    title: 'Grievance Redressal | goZaika',
    description: 'Official grievance workflow and response timelines.',
    indexable: true,
  },
];

export const headerNav = siteRoutes.filter((route: SiteRoute) =>
  ['/how-it-works', '/for-restaurants', '/about', '/faq'].includes(route.href),
);

export const footerColumns = {
  discover: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Cities', href: '/cities' },
  ],
  partners: [
    { label: 'For Restaurants', href: '/for-restaurants' },
    { label: 'Partner Portal', href: '/partner-portal' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Company', href: '/company' },
    { label: 'Leadership', href: '/company/leadership' },
    { label: 'Culture', href: '/company/culture' },
    { label: 'Careers', href: '/company/careers' },
    { label: 'Investors', href: '/company/investors' },
    { label: 'Blog', href: '/blog' },
  ],
  legal: legalRoutes.map((route: SiteRoute) => ({
    label: route.label,
    href: route.href,
  })),
} as const;
