'use client';

import * as React from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@gozaika/utils';

interface InteractiveHoverCardProps {
  children: React.ReactNode;
  className?: string;
}

export function InteractiveHoverCard({
  children,
  className,
}: InteractiveHoverCardProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = React.useState<boolean>(false);
  const [isActive, setIsActive] = React.useState<boolean>(false);

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

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (prefersReducedMotion || !isDesktop || containerRef.current === null) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const rotateX = ((pointerY / rect.height) * -4) + 2;
    const rotateY = ((pointerX / rect.width) * 4) - 2;

    containerRef.current.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
  };

  const handleMouseEnter = (): void => {
    if (prefersReducedMotion || !isDesktop) {
      return;
    }

    setIsActive(true);
  };

  const handleMouseLeave = (): void => {
    if (containerRef.current !== null) {
      containerRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }

    setIsActive(false);
  };

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn('perspective-[1200px]', className)}
      initial={{ opacity: 0.96 }}
      whileHover={isDesktop ? { scale: 1.01 } : undefined}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div
        ref={containerRef}
        className={cn(
          'transition-transform duration-200',
          isActive && isDesktop ? 'shadow-xl shadow-saffron/15' : '',
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        {children}
      </div>
    </motion.div>
  );
}
