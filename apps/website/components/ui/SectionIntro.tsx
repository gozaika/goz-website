'use client';

import { Reveal } from '@/components/ui/Reveal';

interface SectionIntroProps {
  eyebrow?: string;
  title: string;
  body?: string;
  centered?: boolean;
  invert?: boolean;
  className?: string;
  titleAs?: 'h1' | 'h2';
}

export function SectionIntro({
  body,
  centered = false,
  className = '',
  eyebrow,
  invert = false,
  title,
  titleAs = 'h2',
}: SectionIntroProps): React.ReactElement {
  const alignment = centered ? 'text-center mx-auto' : '';
  const titleColor = invert ? 'text-white' : 'text-gray900';
  const bodyColor = invert ? 'text-white/85' : 'text-gray700';
  const eyebrowColor = invert ? 'text-forest-light' : 'text-forest';
  const titleClass = titleAs === 'h1' ? 'heading-page' : 'heading-section';

  return (
    <div className={className}>
      {eyebrow ? (
        <Reveal
          as="p"
          className={`text-xs font-semibold uppercase tracking-[0.24em] ${eyebrowColor} ${alignment}`}
          amount={0.15}
        >
          {eyebrow}
        </Reveal>
      ) : null}
      <Reveal
        as={titleAs}
        className={`${titleClass} mt-4 ${titleColor} ${alignment}`}
        amount={0.2}
        delayClass="reveal-delay-100"
      >
        {title}
      </Reveal>
      {body ? (
        <Reveal
          as="p"
          className={`mt-4 text-base leading-relaxed ${bodyColor} ${alignment}`}
          amount={0.2}
          delayClass="reveal-delay-200"
        >
          {body}
        </Reveal>
      ) : null}
    </div>
  );
}
