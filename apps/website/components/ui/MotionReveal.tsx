'use client';

import * as React from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@gozaika/utils';

interface MotionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section';
  id?: string;
}

export function MotionReveal({
  as = 'div',
  children,
  className,
  delay = 0,
  id,
}: MotionRevealProps): React.ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = React.useState<boolean>(false);
  const Comp = as === 'section' ? motion.section : motion.div;

  React.useEffect((): (() => void) => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const handleViewportChange = (): void => {
      setIsDesktop(mediaQuery.matches);
    };

    handleViewportChange();
    mediaQuery.addEventListener('change', handleViewportChange);

    return (): void => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  if (prefersReducedMotion) {
    return (
      <Comp id={id} className={cn(className)}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      id={id}
      className={cn(className)}
      initial={isDesktop ? { opacity: 0, y: 20 } : { opacity: 0 }}
      whileInView={isDesktop ? { opacity: 1, y: 0 } : { opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
    >
      {children}
    </Comp>
  );
}
