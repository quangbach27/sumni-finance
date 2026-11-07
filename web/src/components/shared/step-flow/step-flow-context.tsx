import { createContext, useContext, useState } from 'react';

import { useStatusAlert } from '@/components/shared/status-alert/status-alert-provider';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import StepConfirmDialog from './step-confirm-dialog';

import type { ReactNode } from 'react';

export type StepConfirmConfig = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Reject to close the dialog and show the failure as an alert on the step. */
  onConfirm: () => Promise<unknown>;
};

export type FlowStepMeta = { id: string };

export type StepStatus = {
  state: 'done' | 'current' | 'todo';
  /** The last confirm of this step failed. */
  invalid: boolean;
};

type StepFlowContextValue = {
  /** Id of the step being viewed. */
  viewedId: string;
  /** True when the viewed step is the one in progress (so it may show its action bar). */
  isCurrent: boolean;
  stepStatus: (id: string) => StepStatus;
  selectStep: (id: string) => void;
  /** Opens the shared confirm dialog; the step is finished by `config.onConfirm`. */
  openConfirm: (config: StepConfirmConfig) => void;
};

const StepFlowContext = createContext<StepFlowContextValue | null>(null);

type ConfirmState =
  | { status: 'idle'; config: StepConfirmConfig | null }
  | { status: 'open' | 'pending'; config: StepConfirmConfig };

/** Owns the flow status: viewed step, per-step status, and the confirm dialog lifecycle. */
export function StepFlowProvider({
  steps,
  currentStepId,
  children,
}: {
  steps: FlowStepMeta[];
  /** Id of the step in progress, derived by the caller; null = all steps done. */
  currentStepId: string | null;
  children: ReactNode;
}) {
  const { showAlert, dismissAlert } = useStatusAlert();

  const currentIndex =
    currentStepId === null
      ? steps.length
      : steps.findIndex((s) => s.id === currentStepId);

  // Remember which step is being viewed together with the current step it was chosen under,
  // so progress changes snap the view back to the current step.
  const [view, setView] = useState<{ id: string; at: string | null }>();
  const [confirm, setConfirm] = useState<ConfirmState>({
    status: 'idle',
    config: null,
  });
  const [failedStepId, setFailedStepId] = useState<string | null>(null);

  const viewedId =
    view && view.at === currentStepId
      ? view.id
      : (steps[currentIndex]?.id ?? steps[steps.length - 1].id);
  const viewedIndex = steps.findIndex((s) => s.id === viewedId);

  const stepStatus = (id: string): StepStatus => {
    const index = steps.findIndex((s) => s.id === id);
    return {
      state:
        index < currentIndex
          ? 'done'
          : index === currentIndex
            ? 'current'
            : 'todo',
      invalid: failedStepId === id,
    };
  };

  const openConfirm = (config: StepConfirmConfig) => {
    setFailedStepId(null);
    dismissAlert();
    setConfirm({ status: 'open', config });
  };

  const run = async () => {
    if (confirm.status !== 'open') return;
    const { config } = confirm;
    const stepId = viewedId;
    setConfirm({ status: 'pending', config });
    try {
      await config.onConfirm();
    } catch (e) {
      const { message, details } = formatApiError(
        e,
        'Không thể hoàn tất bước này.',
      );
      setFailedStepId(stepId);
      showAlert({
        variant: 'destructive',
        title: 'Không thể hoàn tất bước này',
        message,
        details,
      });
    } finally {
      setConfirm({ status: 'idle', config });
    }
  };

  const value: StepFlowContextValue = {
    viewedId,
    isCurrent: viewedIndex === currentIndex,
    stepStatus,
    selectStep: (id) => setView({ id, at: currentStepId }),
    openConfirm,
  };

  return (
    <StepFlowContext.Provider value={value}>
      {children}
      {confirm.config && (
        <StepConfirmDialog
          open={confirm.status !== 'idle'}
          pending={confirm.status === 'pending'}
          title={confirm.config.title}
          description={confirm.config.description}
          confirmLabel={confirm.config.confirmLabel}
          onConfirm={run}
          onCancel={() =>
            setConfirm({ status: 'idle', config: confirm.config })
          }
        />
      )}
    </StepFlowContext.Provider>
  );
}

export function useStepFlow() {
  const ctx = useContext(StepFlowContext);
  if (!ctx) throw new Error('useStepFlow must be used inside <StepFlow>');
  return ctx;
}
