import Image from 'next/image';

import { cn } from '@gozaika/utils';

import { SectionIntro } from '@/components/ui/SectionIntro';

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
  const isFourStepFlow = steps.length === 4;

  return (
    <section id={id} className={cn(className)}>
      <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
        {title ? (
          <SectionIntro
            title={title}
            body={subtitle}
            centered
            className="mx-auto max-w-3xl"
          />
        ) : null}

        <div
          className={cn(
            'relative mt-12 grid gap-5 lg:gap-8',
            isFourStepFlow ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
          )}
        >
          <div
            className={cn(
              'absolute top-10 hidden h-px border-t-2 border-dashed border-saffron/40 lg:block',
              isFourStepFlow ? 'left-[12.5%] right-[12.5%]' : 'left-[16.66%] right-[16.66%]',
            )}
          />

          {steps.map((step, index) => (
            <article
              key={step.title}
              className="premium-card premium-card-hover relative flex flex-col items-start rounded-2xl border-l-4 border-saffron-light bg-white p-6 lg:items-center lg:border-l-0 lg:bg-transparent lg:p-6 lg:text-center"
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
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
