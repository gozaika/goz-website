import * as React from 'react';

interface LegalPageProps {
  title: string;
  sections: ReadonlyArray<string>;
}

export function LegalPage({ sections, title }: LegalPageProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-gray900 md:text-5xl">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray700">
        {sections.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <p className="mt-6 text-xs text-gray500">
        Legal placeholders marked as pending incorporation should be validated by counsel
        before production launch.
      </p>
    </div>
  );
}
