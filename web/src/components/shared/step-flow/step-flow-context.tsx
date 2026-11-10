import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useStatusAlertActions } from '@/components/shared/status-alert/status-alert-provider';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import StepConfirmDialog from './step-confirm-dialog';

import type { ReactNode } from 'react';

export type StepDirection = 'forward' | 'backward';

export type StepConfirmConfig = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** The mutation. The flow moves on only after it resolves; a rejection shows an alert on the step. */
  action: () => Promise<unknown>;
  /** Where to go after `action` succeeds. Defaults to 'forward'. */
  direction?: StepDirection;
};

export type FlowStepMeta = { id: string };

export type StepStatus = {
  state: 'done' | 'current' | 'todo';
  /** The last action of this step failed. */
  invalid: boolean;
};

type StepFlowState = {
  /** Id of the step being viewed. */
  viewedId: string;
  /** True when the viewed step is the one in progress (so it may show its action bar). */
  isCurrent: boolean;
  /** An action is running. */
  pending: boolean;
  stepStatus: (id: string) => StepStatus;
};

type StepFlowActions = {
  selectStep: (id: string) => void;
  goForward: () => void;
  goBackward: () => void;
  /**
   * Runs `fn`, then moves the flow once it resolves. On rejection the flow stays
   * and the failure is shown as an alert on the step. Resolves true on success.
   */
  runAction: (
    fn: () => Promise<unknown>,
    direction?: StepDirection,
  ) => Promise<boolean>;
  /** Opens the flow's confirm dialog; confirming runs `config.action` through `runAction`. */
  openConfirm: (config: StepConfirmConfig) => void;
};

const StepFlowStateContext = createContext<StepFlowState | null>(null);
const StepFlowActionsContext = createContext<StepFlowActions | null>(null);

type ConfirmState = { open: boolean; config: StepConfirmConfig | null };

/** Owns the flow: current step, viewed step, per-step status and the confirm dialog. */
export function StepFlowProvider({
  steps,
  initialStepId,
  children,
}: {
  steps: FlowStepMeta[];
  /** Step the flow starts on; null = all steps done. The flow owns it afterwards. */
  initialStepId: string | null;
  children: ReactNode;
}) {
  const { showAlert, dismissAlert } = useStatusAlertActions();

  // `steps` is usually a fresh array every render; key memoization off the ids instead.
  const stepIdsKey = steps.map((s) => s.id).join('\u0000');
  const stepIds = useMemo(() => stepIdsKey.split('\u0000'), [stepIdsKey]);

  const [currentIndex, setCurrentIndex] = useState(() =>
    initialStepId === null ? stepIds.length : stepIds.indexOf(initialStepId),
  );
  // Remember which step is being viewed together with the current index it was chosen under,
  // so moving the flow snaps the view back to the current step.
  const [view, setView] = useState<{ id: string; at: number }>();
  const [pending, setPending] = useState(false);
  const [failedStepId, setFailedStepId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    config: null,
  });

  const viewedId =
    view && view.at === currentIndex
      ? view.id
      : (stepIds[currentIndex] ?? stepIds[stepIds.length - 1]);
  const viewedIndex = stepIds.indexOf(viewedId);

  // Refs keep the actions identity-stable while still reading the latest values.
  const viewedIdRef = useRef(viewedId);
  const currentIndexRef = useRef(currentIndex);
  const stepCountRef = useRef(stepIds.length);
  useEffect(() => {
    viewedIdRef.current = viewedId;
    currentIndexRef.current = currentIndex;
    stepCountRef.current = stepIds.length;
  });

  const selectStep = useCallback(
    (id: string) => setView({ id, at: currentIndexRef.current }),
    [],
  );

  const goForward = useCallback(
    () => setCurrentIndex((i) => Math.min(i + 1, stepCountRef.current)),
    [],
  );
  const goBackward = useCallback(
    () => setCurrentIndex((i) => Math.max(i - 1, 0)),
    [],
  );

  const runAction = useCallback(
    async (
      fn: () => Promise<unknown>,
      direction: StepDirection = 'forward',
    ) => {
      const stepId = viewedIdRef.current;
      setFailedStepId(null);
      dismissAlert();
      setPending(true);
      try {
        await fn();
        if (direction === 'backward') goBackward();
        else goForward();
        return true;
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
        return false;
      } finally {
        setPending(false);
      }
    },
    [dismissAlert, showAlert, goForward, goBackward],
  );

  const openConfirm = useCallback(
    (config: StepConfirmConfig) => setConfirm({ open: true, config }),
    [],
  );

  const stepStatus = useCallback(
    (id: string): StepStatus => {
      const index = stepIds.indexOf(id);
      return {
        state:
          index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'current'
              : 'todo',
        invalid: failedStepId === id,
      };
    },
    [stepIds, currentIndex, failedStepId],
  );

  const isCurrent = viewedIndex === currentIndex;

  const state = useMemo<StepFlowState>(
    () => ({ viewedId, isCurrent, pending, stepStatus }),
    [viewedId, isCurrent, pending, stepStatus],
  );
  const actions = useMemo<StepFlowActions>(
    () => ({ selectStep, goForward, goBackward, runAction, openConfirm }),
    [selectStep, goForward, goBackward, runAction, openConfirm],
  );

  const confirmAction = async () => {
    const { config } = confirm;
    if (!config) return;
    await runAction(config.action, config.direction);
    setConfirm({ open: false, config });
  };

  return (
    <StepFlowActionsContext.Provider value={actions}>
      <StepFlowStateContext.Provider value={state}>
        {children}
        {confirm.config && (
          <StepConfirmDialog
            open={confirm.open}
            pending={pending}
            title={confirm.config.title}
            description={confirm.config.description}
            confirmLabel={confirm.config.confirmLabel}
            onConfirm={confirmAction}
            onCancel={() => setConfirm({ open: false, config: confirm.config })}
          />
        )}
      </StepFlowStateContext.Provider>
    </StepFlowActionsContext.Provider>
  );
}

export function useStepFlowState() {
  const ctx = useContext(StepFlowStateContext);
  if (!ctx) throw new Error('useStepFlowState must be used inside <StepFlow>');
  return ctx;
}

/** Actions of the surrounding flow, or null when rendered outside a `<StepFlow>`. */
export function useOptionalStepFlowActions() {
  return useContext(StepFlowActionsContext);
}

export function useStepFlowActions() {
  const ctx = useContext(StepFlowActionsContext);
  if (!ctx)
    throw new Error('useStepFlowActions must be used inside <StepFlow>');
  return ctx;
}
