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
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${eyebrowColor} ${alignment}`}>
          {eyebrow}
        </p>
      ) : null}
      {titleAs === 'h1' ? (
        <h1 className={`${titleClass} mt-4 ${titleColor} ${alignment}`}>{title}</h1>
      ) : (
        <h2 className={`${titleClass} mt-4 ${titleColor} ${alignment}`}>{title}</h2>
      )}
      {body ? (
        <p className={`mt-4 text-base leading-relaxed ${bodyColor} ${alignment}`}>
          {body}
        </p>
      ) : null}
    </div>
  );
}
