/**
 * @file apps/website/components/sections/ImpactCounterSection.tsx
 * @description Static impact stats section. Numbers are pre-launch illustrative targets.
 * Wire up to /api/public/impact once live data is available (Slice 3.1).
 */

'use client';

import * as React from 'react';

import { SectionIntro } from '@/components/ui/SectionIntro';
import { homeContent } from '@/lib/content';

export function ImpactCounterSection(): React.ReactElement {
  const { impact } = homeContent;

  return (
    <section className="bg-white" aria-labelledby="impact-heading">
      <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow={impact.eyebrow}
          title={impact.heading}
          body={impact.body}
          centered
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {impact.stats.map((stat) => (
            <ImpactCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ImpactStat {
  value: string;
  label: string;
  sublabel: string;
}

function ImpactCard({ stat }: { stat: ImpactStat }): React.ReactElement {
  return (
    <div className="premium-card group rounded-2xl border border-forest-light bg-cream p-6 text-center transition-shadow hover:shadow-md">
      <p
        className="font-playfair text-4xl font-bold text-forest"
        aria-label={`${stat.value} ${stat.label}`}
      >
        {stat.value}
      </p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray900">
        {stat.label}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-gray500">{stat.sublabel}</p>
    </div>
  );
}
