import StatusAlertOutlet from '@/components/shared/status-alert/status-alert-outlet';
import { StatusAlertProvider } from '@/components/shared/status-alert/status-alert-provider';
import Stepper from '@/components/shared/stepper/stepper';

import {
  StepFlowProvider,
  useStepFlowActions,
  useStepFlowState,
} from './step-flow-context';

import type { ReactNode } from 'react';

export type FlowStep = {
  id: string;
  title: string;
  hint?: string;
  /** UI of this step, including its own action bar; use `useStepFlowActions().openConfirm` to act. */
  content: ReactNode;
};

type Props = {
  steps: FlowStep[];
  /** Step the flow starts on; null = all steps done. The flow owns the current step afterwards. */
  initialStepId: string | null;
};

/** Multi-step flow: stepper plus the viewed step's content. Actions move the flow via `useStepFlowActions()`. */
export default function StepFlow({ steps, initialStepId }: Props) {
  return (
    <StatusAlertProvider>
      <StepFlowProvider steps={steps} initialStepId={initialStepId}>
        <StepFlowView steps={steps} />
      </StepFlowProvider>
    </StatusAlertProvider>
  );
}

function StepFlowView({ steps }: { steps: FlowStep[] }) {
  const { viewedId, stepStatus } = useStepFlowState();
  const { selectStep } = useStepFlowActions();
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
