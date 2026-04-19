import * as React from 'react';

import { cn } from '@gozaika/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helper?: string;
}

export function Input({
  className,
  error,
  helper,
  id,
  label,
  required = false,
  ...props
}: InputProps): React.ReactElement {
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray700">
        {label}
        {required ? <span className="ml-1 text-error">*</span> : null}
      </label>
      <input
        id={id}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error || helper ? hintId : undefined}
        className={cn(
          'h-11 rounded-md border border-gray200 px-3 text-base text-gray900 focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/40',
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
