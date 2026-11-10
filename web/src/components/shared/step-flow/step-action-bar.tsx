import type { ReactNode } from 'react';

type Props = {
  /** Text on the left of the bar (e.g. progress). */
  helper?: ReactNode;
  /** Buttons on the right; put the primary action last. */
  children: ReactNode;
};

/** Sticky action bar at the bottom of a step; render it only for the current step. */
export default function StepActionBar({ helper, children }: Props) {
  return (
    <div className="bg-card sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col gap-3 border-t p-4 md:static md:m-0 md:flex-row md:flex-wrap md:items-center md:justify-between md:rounded-2xl md:border md:px-8 md:shadow-sm">
      <div className="text-muted-foreground text-center text-sm md:text-left">
        {helper}
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center [&_button]:h-11 md:[&_button]:h-10 md:[&_button]:px-5">
        {children}
      </div>
    </div>
  );
}
