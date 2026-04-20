import * as React from 'react';

import { cn } from '@gozaika/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClasses = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-12 px-6 text-base',
} as const;

const variantClasses = {
  primary:
    'bg-saffron text-gray900 hover:bg-[var(--color-saffron-hover)] focus-visible:ring-saffron disabled:bg-saffron/70',
  secondary:
    'border border-forest bg-transparent text-forest hover:bg-forest hover:text-white focus-visible:ring-forest',
  ghost: 'bg-transparent text-forest hover:bg-saffronLight focus-visible:ring-saffron',
  danger:
    'bg-error text-white hover:bg-error/90 focus-visible:ring-error disabled:bg-error/70',
} as const;

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  leftIcon,
  loading = false,
  rightIcon,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {leftIcon}
      {loading ? 'Loading...' : children}
      {rightIcon}
    </button>
  );
}
