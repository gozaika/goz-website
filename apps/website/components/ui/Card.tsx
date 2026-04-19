import * as React from 'react';

import { cn } from '@gozaika/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'featured' | 'minimal';
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  as?: 'div' | 'article' | 'section';
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

const variantClasses = {
  default: 'border border-gray200 bg-white shadow-sm',
  featured: 'border border-forest/15 bg-forestLight shadow-md',
  minimal: 'border border-gray200 bg-transparent',
} as const;

export function Card({
  as = 'div',
  children,
  className,
  hover = false,
  padding = 'md',
  variant = 'default',
}: CardProps): React.ReactElement {
  const Comp = as;

  return (
    <Comp
      className={cn(
        'rounded-lg transition-transform',
        paddingClasses[padding],
        variantClasses[variant],
        hover && 'hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      {children}
    </Comp>
  );
}
