'use client';

import * as React from 'react';

import { ChefHat, MapPin, ShieldCheck } from 'lucide-react';

import { Reveal } from '@/components/ui/Reveal';

interface TrustBadge {
  title: string;
  subtitle: string;
}

interface TrustBadgesSectionProps {
  badges: ReadonlyArray<TrustBadge>;
}

const iconMap = [ChefHat, ShieldCheck, MapPin] as const;

export function TrustBadgesSection({
  badges,
}: TrustBadgesSectionProps): React.ReactElement {
  return (
    <section className="bg-forest py-8">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {badges.map((badge, index) => {
            const Icon = iconMap[index] ?? ChefHat;
            const delayClass =
              index === 1 ? 'reveal-delay-80' : index === 2 ? 'reveal-delay-160' : undefined;

            return (
              <Reveal
                as="div"
                key={badge.title}
                className="flex items-center gap-3"
                amount={0.15}
                delayClass={delayClass}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-saffron">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{badge.title}</p>
                  <p className="text-xs text-forest-light">{badge.subtitle}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
