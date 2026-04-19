import * as React from 'react';

import { cn } from '@gozaika/utils';

interface EnergyAccentProps {
  className?: string;
}

export function EnergyAccent({ className }: EnergyAccentProps): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem]',
        className,
      )}
    >
      <div className="energy-orb energy-orb-saffron absolute -left-20 top-0 h-56 w-56 rounded-full blur-3xl md:h-72 md:w-72" />
      <div className="energy-orb energy-orb-gold absolute -right-20 bottom-10 h-56 w-56 rounded-full blur-3xl md:h-72 md:w-72" />
      <div className="energy-grid absolute inset-0 opacity-30" />
    </div>
  );
}
