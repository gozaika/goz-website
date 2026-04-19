'use client';

import * as React from 'react';

import Image from 'next/image';

import { cn } from '@gozaika/utils';

import { Reveal } from '@/components/ui/Reveal';

interface HowItWorksStep {
  title: string;
  description: string;
  icon: string;
}

interface HowItWorksFlowProps {
  id?: string;
  title?: string;
  subtitle?: string;
  steps: ReadonlyArray<HowItWorksStep>;
  className?: string;
}

export function HowItWorksFlow({
  className,
  id,
  steps,
  subtitle,
  title,
}: HowItWorksFlowProps): React.ReactElement {
  return (
    <section id={id} className={cn(className)}>
      <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
        {title ? <h2 className="heading-section text-center text-gray900">{title}</h2> : null}
        {subtitle ? (
          <p className="text-lead mx-auto mt-4 max-w-3xl text-center text-gray600">{subtitle}</p>
        ) : null}

        <div className="relative mt-12 grid gap-5 lg:grid-cols-3 lg:gap-8">
          <div className="absolute top-10 left-[16.66%] right-[16.66%] hidden h-px border-t-2 border-dashed border-saffron/40 lg:block" />

          {steps.map((step, index) => (
            <Reveal
              as="article"
              key={step.title}
              className="relative flex flex-col items-start rounded-lg border-l-4 border-saffron-light bg-white p-6 shadow-sm lg:items-center lg:border-l-0 lg:bg-transparent lg:p-0 lg:text-center lg:shadow-none"
              amount={0.2}
              delayClass={index === 1 ? 'reveal-delay-100' : index === 2 ? 'reveal-delay-200' : undefined}
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-saffron bg-saffron-light">
                <Image
                  src={step.icon}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10"
                />
              </div>
              <span className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-forest">
                Step {index + 1}
              </span>
              <h3 className="text-xl font-semibold text-gray900">{step.title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray600">
                {step.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
