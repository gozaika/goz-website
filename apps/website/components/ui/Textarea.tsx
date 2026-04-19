import * as React from 'react';

import { cn } from '@gozaika/utils';

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  helper?: string;
}

export function Textarea({
  className,
  error,
  helper,
  id,
  label,
  required = false,
  ...props
}: TextareaProps): React.ReactElement {
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray700">
        {label}
        {required ? <span className="ml-1 text-error">*</span> : null}
      </label>
      <textarea
        id={id}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error || helper ? hintId : undefined}
        className={cn(
          'min-h-28 rounded-md border border-gray200 px-3 py-2 text-base text-gray900 focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/40',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={hintId} className="text-sm text-error">
          {error}
        </p>
      ) : null}
      {!error && helper ? (
        <p id={hintId} className="text-sm text-gray500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
