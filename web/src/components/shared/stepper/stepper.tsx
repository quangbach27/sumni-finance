import { Check } from 'lucide-react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export type Step = {
  /** Required for selectable steps (when `onSelect` is passed). */
  id?: string;
  title: string;
  hint: string;
  state: 'done' | 'current' | 'todo';
  /** Marks the step as failed (sets `aria-invalid`). */
  invalid?: boolean;
};

function CompactStepper({ steps, selectedId, onSelect }: StepperProps) {
  const selected = steps.findIndex(
    (s) => s.id !== undefined && s.id === selectedId,
  );
  const current =
    selected >= 0
      ? selected
      : Math.max(
          steps.findIndex((s) => s.state === 'current'),
          0,
        );
  const step = steps[current];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={s.title}
            aria-invalid={s.invalid || undefined}
            disabled={!onSelect || !s.id || s.state === 'todo'}
            onClick={() => s.id && onSelect?.(s.id)}
            className={cn(
              'aria-invalid:bg-destructive h-2 flex-1 rounded-full',
              s.state === 'todo' ? 'bg-border' : 'bg-primary',
              i === current && s.state === 'done' && 'opacity-60',
            )}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">
          Bước {current + 1}/{steps.length} · {step.title}
        </span>
        <span
          className={cn(
            'text-muted-foreground',
            step.invalid && 'text-destructive',
          )}
        >
          {step.hint}
        </span>
      </div>
    </div>
  );
}

type StepperProps = {
  steps: Step[];
  /** Id of the step being viewed (may differ from the current step). */
  selectedId?: string;
  /** Makes done/current steps clickable. */
  onSelect?: (id: string) => void;
};

function FullStepper({ steps, selectedId, onSelect }: StepperProps) {
  return (
    <ol className="bg-card flex items-center gap-4 rounded-2xl border p-4 px-8 shadow-sm">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className={cn(
            'flex items-center gap-3',
            i < steps.length - 1 && 'flex-1',
          )}
        >
          <button
            type="button"
            disabled={!onSelect || !s.id || s.state === 'todo'}
            aria-invalid={s.invalid || undefined}
            aria-current={
              s.id !== undefined && s.id === selectedId ? 'step' : undefined
            }
            onClick={() => s.id && onSelect?.(s.id)}
            className="group flex items-center gap-3 text-left enabled:cursor-pointer disabled:cursor-default"
          >
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-semibold',
                'group-aria-invalid:border-destructive-border group-aria-invalid:ring-destructive/20 dark:group-aria-invalid:ring-destructive/40 group-aria-invalid:ring-3',
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
              <p className="text-muted-foreground group-aria-invalid:text-destructive text-sm">
                {s.hint}
              </p>
            </div>
          </button>
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
export default function Stepper(props: StepperProps) {
  const isMobile = useIsMobile();
  return isMobile ? <CompactStepper {...props} /> : <FullStepper {...props} />;
}
