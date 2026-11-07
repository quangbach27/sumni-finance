import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type Step = {
  title: string;
  hint: string;
  state: 'done' | 'current' | 'todo';
};

function CompactStepper({ steps }: { steps: Step[] }) {
  const current = Math.max(
    steps.findIndex((s) => s.state === 'current'),
    0,
  );
  const step = steps[current];
  return (
    <div className="flex flex-col gap-2 md:hidden">
      <div className="flex gap-2">
        {steps.map((s) => (
          <span
            key={s.title}
            className={cn(
              'h-1 flex-1 rounded-full',
              s.state === 'todo' ? 'bg-border' : 'bg-primary',
            )}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">
          Bước {current + 1}/{steps.length} · {step.title}
        </span>
        <span className="text-muted-foreground">{step.hint}</span>
      </div>
    </div>
  );
}

function FullStepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="bg-card hidden items-center gap-4 rounded-2xl border p-4 shadow-sm md:flex md:px-8">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className={cn(
            'flex items-center gap-3',
            i < steps.length - 1 && 'flex-1',
          )}
        >
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-semibold',
              s.state === 'done' &&
                'border-primary bg-primary text-primary-foreground',
              s.state === 'current' && 'border-primary text-primary',
              s.state === 'todo' &&
                'bg-muted text-muted-foreground border-transparent',
            )}
          >
            {s.state === 'done' ? <Check className="size-5" /> : i + 1}
          </span>
          <div className={cn(s.state === 'todo' && 'text-muted-foreground')}>
            <p className="font-semibold">{s.title}</p>
            <p className="text-muted-foreground text-sm">{s.hint}</p>
          </div>
          {i < steps.length - 1 && (
            <span
              className={cn(
                'h-0.5 flex-1',
                s.state === 'done' ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

/** Progress through a multi-step flow: compact bar on mobile, full list on desktop. */
export default function Stepper({ steps }: { steps: Step[] }) {
  return (
    <>
      <CompactStepper steps={steps} />
      <FullStepper steps={steps} />
    </>
  );
}
