import StatusAlertOutlet from '@/components/shared/status-alert/status-alert-outlet';
import { StatusAlertProvider } from '@/components/shared/status-alert/status-alert-provider';
import Stepper from '@/components/shared/stepper/stepper';

import { StepFlowProvider, useStepFlow } from './step-flow-context';

import type { ReactNode } from 'react';

export type FlowStep = {
  id: string;
  title: string;
  hint?: string;
  /** UI of this step, including its own action bar; use `useStepFlow` to confirm. */
  content: ReactNode;
};

type Props = {
  steps: FlowStep[];
  /** Id of the step in progress, derived by the caller; null = all steps done. */
  currentStepId: string | null;
};

/** Multi-step flow: stepper plus the viewed step's content. Steps finish via `useStepFlow().openConfirm`. */
export default function StepFlow({ steps, currentStepId }: Props) {
  return (
    <StatusAlertProvider>
      <StepFlowProvider steps={steps} currentStepId={currentStepId}>
        <StepFlowView steps={steps} />
      </StepFlowProvider>
    </StatusAlertProvider>
  );
}

function StepFlowView({ steps }: { steps: FlowStep[] }) {
  const { viewedId, stepStatus, selectStep } = useStepFlow();
  const viewed = steps.find((s) => s.id === viewedId) ?? steps[0];

  return (
    <div className="flex flex-col gap-5">
      <Stepper
        steps={steps.map((s) => {
          const { state, invalid } = stepStatus(s.id);
          return {
            id: s.id,
            title: s.title,
            hint: s.hint ?? '',
            state,
            invalid,
          };
        })}
        selectedId={viewedId}
        onSelect={selectStep}
      />

      {stepStatus(viewedId).invalid && <StatusAlertOutlet />}

      {viewed.content}
    </div>
  );
}
