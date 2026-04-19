import type { Metadata } from 'next';

import { BamBagSection } from '@/components/sections/BamBagSection';
import { HeroSection } from '@/components/sections/HeroSection';
import { HomeWaitlistSection } from '@/components/sections/HomeWaitlistSection';
import { HowItWorksFlow } from '@/components/sections/HowItWorksFlow';
import { RestaurantTeaserSection } from '@/components/sections/RestaurantTeaserSection';
import { TrustBadgesSection } from '@/components/sections/TrustBadgesSection';
import { homeContent } from '@/lib/content';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'goZaika — Discover. Pickup. Devour.',
  description:
    'Discover chef-curated BAM Bags from premium restaurants near you. Buy, pickup, and devour.',
  ...canonical('/'),
  openGraph: openGraphFor(
    '/',
    'goZaika — Discover. Pickup. Devour.',
    'Premium-access mystery meal drops from trusted restaurants.',
    '/images/social/og-home-v2.svg',
  ),
  twitter: twitterFor(
    'goZaika — Discover. Pickup. Devour.',
    'Premium-access mystery meal drops from trusted restaurants.',
    '/images/social/og-home-v2.svg',
  ),
};

export default function HomePage(): React.ReactElement {
  return (
    <>
      <HeroSection {...homeContent.hero} />
      <TrustBadgesSection badges={homeContent.trustBadges} />
      <HowItWorksFlow
        id="steps"
        className="bg-white"
        title="How a BAM Bag works"
        steps={homeContent.howItWorks}
      />
      <BamBagSection {...homeContent.bamBag} />
      <RestaurantTeaserSection {...homeContent.restaurantTeaser} />
      {/* PHASE 2: Restore testimonials with real quotes post-pilot */}
      <HomeWaitlistSection
        heading={homeContent.launch.heading}
        body={homeContent.launch.body}
        disclaimer={homeContent.launch.disclaimer}
        restaurants={homeContent.partnerPreviews}
      />
    </>
  );
}
